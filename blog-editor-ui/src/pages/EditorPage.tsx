import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { BlogPost } from '../types';
import { apiService } from '../services/ApiService';
import { useToast } from '../hooks/useToast';
import { useAutoSaveManager } from '../hooks/useAutoSaveManager';
import { useDraftPersistence } from '../hooks/useDraftPersistence';
import { useNewPostDraft } from '../hooks/useNewPostDraft';
import { useIntelligentDraftRecovery } from '../hooks/useIntelligentDraftRecovery';
import { useSuggestionManager } from '../hooks/useSuggestionManager';
import { usePageTitle } from '../hooks/usePageTitle';
import { EditorHeader } from '../components/editor/EditorHeader';
import { TitleEditor } from '../components/editor/TitleEditor';
import { ContentEditor } from '../components/editor/ContentEditor';
import { ContentSummary } from '../components/editor/ContentSummary';
import { SuggestionsPanel } from '../components/editor/SuggestionsPanel';
import { EditorActions } from '../components/editor/EditorActions';
import { SuggestionStats } from '../components/editor/SuggestionStats';
import { UndoNotification } from '../components/editor/UndoNotification';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { InfoBox, AppHeader } from '../components/common';
import { DraftRecoveryNotification } from '../components/editor/DraftRecoveryNotification';
import { NewPostRecoveryNotification } from '../components/editor/NewPostRecoveryNotification';
import { ConflictResolutionModal } from '../components/editor/ConflictResolutionModal';
import { LocalStorageManager } from '../utils/localStorage';
import { useInfoBoxManager } from '../hooks/useInfoBoxManager';
import { useAsyncReview } from '../hooks/useAsyncReview';
import { ReviewNotificationContainer } from '../components/ReviewNotification';
import {
  detectConflict,
  createConflictData,
  applyResolution,
  type ConflictData,
  type ConflictResolution
} from '../utils/conflictResolution';
import { EditorErrorBoundary } from '../components/editor/EditorErrorBoundary';
import { EditorFallbackUI } from '../components/editor/EditorFallbackUI';
import { ErrorReportingManager } from '../utils/errorReporting';
import { EditorBackupManager } from '../utils/editorBackup';
import { useRenderPerformanceMonitor } from '../hooks/useRenderPerformanceMonitor';
import { componentCleanupManager } from '../utils/componentCleanupManager';
import { editorIntegrationManager } from '../utils/editorIntegrationManager';

export const EditorPage = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { isDismissed, dismissInfoBox } = useInfoBoxManager();

  // Check if this is a new post - memoize to prevent re-calculations
  const isNewPost = useMemo(() => id === 'new', [id]);

  // Integration testing and monitoring
  useEffect(() => {
    // Perform integration health check after component mounts
    const performIntegrationCheck = async () => {
      try {
        const healthCheck = await editorIntegrationManager.performHealthCheck();

        if (healthCheck.overallHealth === 'critical') {
          console.error('Critical editor integration issues detected:', healthCheck.recommendations);
          // Could show user-friendly warning here if needed
        } else if (healthCheck.overallHealth === 'warning') {
          console.warn('Editor integration warnings:', healthCheck.recommendations);
        }

        // Log successful integration for debugging
        console.log('Editor integration health check completed:', {
          health: healthCheck.overallHealth,
          authPersistent: healthCheck.integrationState.authenticationPersistent,
          contentStable: healthCheck.integrationState.contentStable,
          titleVisible: healthCheck.integrationState.titleEditorVisible,
          draftIntelligent: healthCheck.integrationState.draftDialogIntelligent,
          errorHandling: healthCheck.integrationState.errorHandlingActive,
          cleanup: healthCheck.integrationState.cleanupConfigured
        });
      } catch (error) {
        console.error('Integration health check failed:', error);
      }
    };

    // Perform check after a short delay to allow component to fully initialize
    const integrationCheckTimeout = setTimeout(performIntegrationCheck, 2000);

    // Register timeout for cleanup
    componentCleanupManager.registerTimeout(
      integrationCheckTimeout,
      'EditorPage',
      'Integration health check'
    );

    return () => clearTimeout(integrationCheckTimeout);
  }, []);

  // Comprehensive cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean up all EditorPage-specific tasks
      const cleanedTasks = componentCleanupManager.cleanupComponent('EditorPage');
      if (cleanedTasks > 0) {
        console.log(`EditorPage cleanup: removed ${cleanedTasks} tasks`);
      }
    };
  }, []);

  // Monitor render performance to detect flickering
  useRenderPerformanceMonitor({
    componentName: 'EditorPage',
    flickerThreshold: 8, // 8 renders per second indicates flickering
    enabled: true,
    onFlickerDetected: (metrics) => {
      // Report flickering for debugging
      ErrorReportingManager.reportEditorError(
        new Error('Content flickering detected'),
        id || null,
        'EditorPage',
        Boolean(title.trim() || content.trim()),
        {
          renderMetrics: metrics,
          postId: id,
          isNewPost,
          hasContent: Boolean(content.trim()),
          hasTitle: Boolean(title.trim())
        }
      );
    }
  });

  const [post, setPost] = useState<BlogPost | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');

  // Set page title based on post state
  usePageTitle(isNewPost ? 'New Post' : (title.trim() || 'Editor'));
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [hasDraftToRecover, setHasDraftToRecover] = useState(false);

  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [, setInitialLoadTimestamp] = useState<number>(0);
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const [isCreatingPost, setIsCreatingPost] = useState(false);

  // Workflow confirmation modals
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showFinalizeConfirmation, setShowFinalizeConfirmation] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Navigation confirmation modal
  const [showNavigationConfirmation, setShowNavigationConfirmation] = useState(false);

  // Auto-save hook with enhanced post ID handling and retry logic
  const {
    isSaving: isAutoSaving,
    lastSaved,
    hasUnsavedChanges: hasAutoSaveUnsavedChanges,
    saveError,
    forceSave,
    clearError: clearSaveError
  } = useAutoSaveManager({
    postId: isNewPost ? null : (id || null),
    title,
    content,
    onSaveSuccess: (savedPost) => {
      setPost(savedPost);
      setIsDirty(false);
      clearDraft(); // Clear draft after successful auto-save
    },
    onSaveError: (error) => {
      showError(`Auto-save failed: ${error}`);
    },
    onPostCreated: (newPostId) => {
      // Navigate to the new post's editor page when created
      navigate(`/editor/${newPostId}`, { replace: true });
    },
    enabled: true // Always enabled, hook handles new post logic internally
  });

  // Draft persistence hook - use "new" as postId for new posts
  const {
    loadDraft,
    clearDraft,
    isDraftDifferent,
    lastError: draftError,
    clearError: clearDraftError
  } = useDraftPersistence({
    postId: id || '',
    title,
    content,
    enabled: !!id && !isNewPost,
    onError: (error) => {
      // Show user-friendly error messages for draft issues
      let userMessage: string;
      switch (error.type) {
        case 'quota_exceeded':
          userMessage = 'Browser storage is full. Your draft may not be saved automatically. Consider clearing browser data.';
          break;
        case 'parse_error':
          userMessage = 'Previous draft data was corrupted and has been cleared.';
          break;
        case 'storage_unavailable':
          userMessage = 'Draft auto-save is not available in this browser.';
          break;
        case 'conflict':
          userMessage = 'Unable to compare draft with current content. Please save your work manually.';
          break;
        default:
          userMessage = 'Draft auto-save encountered an issue. Please save your work manually.';
      }
      showError(userMessage);
    }
  });

  // New post draft persistence hook
  const {
    clearDraft: clearNewPostDraft,
    showRecoveryPrompt: showNewPostRecoveryPrompt,
    dismissRecoveryPrompt: dismissNewPostRecoveryPrompt
  } = useNewPostDraft({
    title,
    content,
    enabled: isNewPost
  });

  // Intelligent draft recovery hook
  const {
    shouldShowDialog: shouldShowDraftDialog,
    isVisible: isDraftDialogVisible,
    handleDismiss: handleDraftDismiss,
    handleRecover: handleDraftRecover,
    handleDiscard: handleDraftDiscard
  } = useIntelligentDraftRecovery({
    draftData: hasDraftToRecover ? loadDraft() : null,
    ageThresholdMs: 5000, // 5 seconds
    showDelayMs: 500, // 500ms delay
    onShow: () => {
      console.log('Draft recovery dialog shown');
    },
    onDismiss: () => {
      setHasDraftToRecover(false);
    }
  });

  // Handle content changes - memoized to prevent unnecessary re-renders
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  }, []);

  // Handle title changes - memoized to prevent unnecessary re-renders
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
  }, []);

  // Suggestion management hook - disabled for new posts
  // Memoize the config to prevent unnecessary re-renders
  const suggestionConfig = useMemo(() => ({
    postId: id || '',
    maxUndoHistory: 10,
    persistState: true,
    autoSaveOnAccept: true
  }), [id]);

  const {
    suggestions,
    summary,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    undoHistory,
    loadSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    undoLastAcceptance,
    clearError: clearSuggestionsError,
    stats,
    canUndo,
    hasActiveSuggestions
  } = useSuggestionManager(content, handleContentChange, suggestionConfig);

  // Review hook - for real-time AI analysis
  const {
    notifications: reviewNotifications,
    isReviewInProgress,
    startReview,
    removeNotification: removeReviewNotification,
    canStartReview
  } = useAsyncReview({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    onReviewComplete: () => {
      // Refresh suggestions when review completes
      if (!isNewPost && post) {
        loadSuggestions();
        showSuccess('New suggestions are available!');
      }
    },
    onReviewError: (error) => {
      showError(`Review failed: ${error}`);
    }
  });

  // Combined saving state - memoized to prevent re-renders
  const isSaving = useMemo(() => isAutoSaving || isCreatingPost, [isAutoSaving, isCreatingPost]);

  // Load post data on mount
  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        showError('No post ID provided');
        navigate('/dashboard');
        return;
      }

      // Handle new post creation
      if (isNewPost) {
        try {
          setIsLoading(true);

          // Initialize empty new post - recovery will be handled by the hook
          setTitle('');
          setContent('');

          // Create a temporary post object for new posts
          const tempPost: BlogPost = {
            id: 'new',
            title: '',
            body: '',
            status: 'draft',
            version: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            authorId: 'current-user' // This will be set by the backend
          };
          setPost(tempPost);
          setInitialLoadTimestamp(Date.now());
        } catch (error) {
          console.error('Failed to initialize new post:', error);
          showError('Failed to initialize new post');
          navigate('/dashboard');
        } finally {
          setIsLoading(false);
        }
        return;
      }

      // Handle existing post loading
      try {
        setIsLoading(true);
        const loadedPost = await apiService.getPost(id);
        setPost(loadedPost);
        setInitialLoadTimestamp(Date.now());

        // Check for local draft
        const draft = loadDraft();

        if (draft) {
          // Check if draft content is different from loaded content
          const draftIsDifferent = isDraftDifferent(loadedPost.title, loadedPost.body);

          if (draftIsDifferent) {
            // Check for conflicts
            const hasConflict = detectConflict(
              loadedPost,
              draft.title,
              draft.content,
              draft.timestamp
            );

            if (hasConflict) {
              // Show conflict resolution modal
              const conflict = createConflictData(
                loadedPost,
                draft.title,
                draft.content,
                draft.timestamp
              );
              setConflictData(conflict);
              // Set server version initially
              setTitle(loadedPost.title);
              setContent(loadedPost.body);
            } else {
              // No conflict, show draft recovery notification
              setTitle(loadedPost.title);
              setContent(loadedPost.body);
              setHasDraftToRecover(true);
            }
          } else {
            // Draft content matches loaded content, clear draft and use server version
            clearDraft();
            setTitle(loadedPost.title);
            setContent(loadedPost.body);
          }
        } else {
          // No draft, use server version
          setTitle(loadedPost.title);
          setContent(loadedPost.body);
        }

        // Load suggestions for existing posts
        if (loadedPost.status === 'draft' || loadedPost.status === 'review') {
          loadSuggestions();
        }
      } catch (error) {
        console.error('Failed to load post:', error);
        showError('Failed to load post');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [id, navigate, showError, isNewPost]);

  // Manual save (force save)
  const handleSave = useCallback(async () => {
    if (!post) return;

    // Handle new post creation
    if (isNewPost) {
      if (!title.trim()) {
        showError('Title is required to save a new post');
        return;
      }

      if (!content.trim()) {
        showError('Content is required to save a new post');
        return;
      }

      if (title.trim().length < 3) {
        showError('Title must be at least 3 characters long');
        return;
      }

      if (content.trim().length < 10) {
        showError('Content must be at least 10 characters long');
        return;
      }

      try {
        setIsCreatingPost(true);
        const newPost = await apiService.createPost({
          title: title.trim(),
          body: content.trim()
        });

        setPost(newPost);
        setIsDirty(false);
        clearNewPostDraft(); // Clear new post draft after successful creation
        showSuccess('Post created successfully');

        // Navigate to the new post's editor page
        navigate(`/editor/${newPost.id}`, { replace: true });
      } catch (error) {
        console.error('Failed to create post:', error);
        showError('Failed to create post');
      } finally {
        setIsCreatingPost(false);
      }
      return;
    }

    // Handle existing post save
    if (!isDirty) return;

    try {
      await forceSave();
      showSuccess('Post saved successfully');
    } catch (error) {
      console.error('Failed to save post:', error);
      showError('Failed to save post');
    }
  }, [post, isDirty, isNewPost, title, content, forceSave, showSuccess, showError, navigate, clearNewPostDraft]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S for manual save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty && !isSaving) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    // Register event listener for cleanup
    componentCleanupManager.registerEventListener(
      document,
      'keydown',
      handleKeyDown,
      'EditorPage',
      'Keyboard shortcuts handler'
    );

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, isSaving, handleSave]);

  // Clear save errors when user starts typing
  useEffect(() => {
    if (saveError && (isDirty || content || title)) {
      clearSaveError();
    }
  }, [saveError, isDirty, content, title]);

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsavedContent = isDirty || (isNewPost && (title.trim() || content.trim()));
      if (hasUnsavedContent) {
        e.preventDefault();
        const message = isNewPost
          ? 'You have an unsaved new post. Are you sure you want to leave?'
          : 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Register event listener for cleanup
    componentCleanupManager.registerEventListener(
      window,
      'beforeunload',
      handleBeforeUnload,
      'EditorPage',
      'Before unload handler'
    );

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isNewPost, title, content]);

  // Handle draft recovery with intelligent system
  const handleRecoverDraft = useCallback((draftData: { title: string; content: string; timestamp: number }) => {
    setTitle(draftData.title);
    setContent(draftData.content);
    setIsDirty(true);
    handleDraftRecover(); // Use intelligent recovery handler
    showSuccess('Draft recovered successfully');
  }, [handleDraftRecover, showSuccess]);

  // Handle draft discard with intelligent system
  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    handleDraftDiscard(); // Use intelligent discard handler
    showSuccess('Draft discarded');
  }, [clearDraft, handleDraftDiscard, showSuccess]);

  // Handle new post draft recovery
  const handleRecoverNewPostDraft = useCallback((draftData: { title: string; content: string; timestamp: number }) => {
    setTitle(draftData.title);
    setContent(draftData.content);
    setIsDirty(true);
    showSuccess('Draft recovered successfully');
  }, [showSuccess]);



  // Handle conflict resolution
  const handleConflictResolution = useCallback((resolution: ConflictResolution) => {
    if (!conflictData) return;

    const resolved = applyResolution(conflictData, resolution);
    setTitle(resolved.title);
    setContent(resolved.content);
    setIsDirty(true);
    setConflictData(null);

    // Clear the draft since we've resolved the conflict
    clearDraft();

    showSuccess('Conflict resolved successfully');
  }, [conflictData, clearDraft, showSuccess]);

  // Handle suggestion acceptance
  const handleAcceptSuggestion = useCallback(async (suggestionId: string) => {
    try {
      await acceptSuggestion(suggestionId);
      setShowUndoNotification(true);
      showSuccess('Suggestion applied');
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      showError('Failed to apply suggestion');
    }
  }, [acceptSuggestion, showSuccess, showError]);

  // Handle suggestion rejection
  const handleRejectSuggestion = useCallback(async (suggestionId: string) => {
    try {
      await rejectSuggestion(suggestionId);
      showSuccess('Suggestion rejected');
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      showError('Failed to reject suggestion');
    }
  }, [rejectSuggestion, showSuccess, showError]);

  // Handle suggestion deletion
  const handleDeleteSuggestion = useCallback(async (suggestionId: string) => {
    try {
      await rejectSuggestion(suggestionId); // Use the same logic as reject for now
      showSuccess('Suggestion deleted');
    } catch (error) {
      console.error('Failed to delete suggestion:', error);
      showError('Failed to delete suggestion');
    }
  }, [rejectSuggestion, showSuccess, showError]);

  // Handle undo
  const handleUndo = useCallback(() => {
    try {
      undoLastAcceptance();
      setShowUndoNotification(false);
      showSuccess('Suggestion undone');
    } catch (error) {
      console.error('Failed to undo suggestion:', error);
      showError('Failed to undo suggestion');
    }
  }, [undoLastAcceptance, showSuccess, showError]);

  // Handle back navigation with unsaved changes warning
  const handleNavigateBack = useCallback(() => {
    if (isDirty || (isNewPost && (title.trim() || content.trim()))) {
      setShowNavigationConfirmation(true);
    } else {
      navigate('/dashboard');
    }
  }, [isDirty, isNewPost, title, content, navigate]);

  // Confirm navigation away from unsaved changes
  const handleNavigationConfirmed = useCallback(() => {
    setShowNavigationConfirmation(false);
    // Clear draft for new posts when user confirms navigation away
    if (isNewPost) {
      clearNewPostDraft();
      LocalStorageManager.cleanupOldDrafts();
    } else {
      clearDraft();
    }
    navigate('/dashboard');
  }, [navigate, isNewPost, clearNewPostDraft, clearDraft]);

  // Clear suggestions error when user dismisses
  useEffect(() => {
    if (suggestionsError) {
      const timer = setTimeout(() => {
        clearSuggestionsError();
      }, 5000);

      // Register timeout for cleanup
      componentCleanupManager.registerTimeout(timer, 'EditorPage', 'Clear suggestions error');

      return () => clearTimeout(timer);
    }
  }, [suggestionsError]);

  // Workflow validation
  const validateWorkflowAction = (): { isValid: boolean; error?: string } => {
    if (!post) {
      return { isValid: false, error: 'No post loaded' };
    }

    if (isNewPost) {
      return { isValid: false, error: 'Please create and save your new post before submitting for review or finalizing' };
    }

    if (!title.trim()) {
      return { isValid: false, error: 'Post title is required' };
    }

    if (!content.trim()) {
      return { isValid: false, error: 'Post content is required' };
    }

    if (title.trim().length < 5) {
      return { isValid: false, error: 'Post title must be at least 5 characters long' };
    }

    if (content.trim().length < 50) {
      return { isValid: false, error: 'Post content must be at least 50 characters long' };
    }

    if (post.status === 'finalized') {
      return { isValid: false, error: 'This post has already been finalized' };
    }

    if (post.status === 'published') {
      return { isValid: false, error: 'This post has already been published' };
    }

    return { isValid: true };
  };

  // Show submit for review confirmation
  const handleSubmitReviewClick = () => {
    const validation = validateWorkflowAction();
    if (!validation.isValid) {
      showError(validation.error!);
      return;
    }

    if (isDirty) {
      showError('Please save your changes before submitting for review');
      return;
    }

    setShowSubmitConfirmation(true);
  };

  // Show finalize confirmation
  const handleFinalizeClick = () => {
    const validation = validateWorkflowAction();
    if (!validation.isValid) {
      showError(validation.error!);
      return;
    }

    if (isDirty) {
      showError('Please save your changes before finalizing');
      return;
    }

    setShowFinalizeConfirmation(true);
  };



  // Submit for review (confirmed)
  const handleSubmitReviewConfirmed = async () => {
    if (!post) return;

    try {
      setIsSubmittingReview(true);

      // Double-check validation
      const validation = validateWorkflowAction();
      if (!validation.isValid) {
        showError(validation.error!);
        return;
      }

      // Save any pending changes first
      if (isDirty) {
        await forceSave();
      }

      // Start the review process with real-time feedback
      if (!canStartReview) {
        showError('A review is already in progress');
        return;
      }

      // Call the review endpoint and start polling
      await startReview(post.id);

      clearDraft(); // Clear draft after successful submission
      showSuccess('Review started! You\'ll receive real-time AI suggestions.');
      setShowSubmitConfirmation(false);

      // Don't navigate away - stay on the page to show real-time feedback
    } catch (error) {
      console.error('Failed to submit for review:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit for review';
      showError(`Submit for review failed: ${errorMessage}`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Finalize draft (confirmed)
  const handleFinalizeConfirmed = async () => {
    if (!post) return;

    try {
      setIsFinalizing(true);

      // Double-check validation
      const validation = validateWorkflowAction();
      if (!validation.isValid) {
        showError(validation.error!);
        return;
      }

      // Save any pending changes first
      if (isDirty) {
        await forceSave();
      }

      await apiService.finalizeDraft(post.id);
      clearDraft(); // Clear draft after successful finalization
      showSuccess('Draft finalized successfully. Your post is now ready for publication.');
      setShowFinalizeConfirmation(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to finalize draft:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to finalize draft';
      showError(`Finalize failed: ${errorMessage}`);
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional App Header */}
      <AppHeader
        editorContext={{
          isNewPost,
          postTitle: title.trim() || undefined,
          isDirty,
          onNavigateBack: handleNavigateBack
        }}
      />

      <EditorErrorBoundary
        postId={id}
        title={title}
        content={content}
        onError={(error, errorInfo) => {
          // Report error for debugging
          ErrorReportingManager.reportEditorError(
            error,
            id || null,
            'EditorPage',
            Boolean(title.trim() || content.trim()),
            { errorInfo }
          );

          // Create backup for critical failures
          EditorBackupManager.createErrorBackup(
            id || null,
            title,
            content,
            error,
            'EditorPage'
          );
        }}
        fallback={(error, actions) => (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6">
            <EditorFallbackUI
              error={error}
              onRetry={actions.retry}
              onSaveBackup={actions.saveBackup}
              postId={id || null}
              title={title}
              content={content}
              componentName="Editor Page"
            />
          </div>
        )}
      >
        <div className="max-w-7xl mx-auto">
        <EditorHeader
          isSaving={isSaving}
          isDirty={isDirty}
          lastSaved={lastSaved}
          onSave={handleSave}
          isNewPost={isNewPost}
        />

        {/* Notifications */}
        <div className="px-3 sm:px-4 lg:px-6 xl:px-8">
          {/* Intelligent Draft Recovery Notification */}
          {shouldShowDraftDialog && (() => {
            const draftData = loadDraft();
            return draftData ? (
              <div className="pt-3 sm:pt-4">
                <DraftRecoveryNotification
                  draftData={draftData}
                  isVisible={isDraftDialogVisible}
                  onRecover={handleRecoverDraft}
                  onDiscard={handleDiscardDraft}
                  onDismiss={handleDraftDismiss}
                />
              </div>
            ) : null;
          })()}

          {/* New Post Recovery Notification */}
          {showNewPostRecoveryPrompt && (
            <div className="pt-3 sm:pt-4">
              <NewPostRecoveryNotification
                onRecover={handleRecoverNewPostDraft}
                onDismiss={dismissNewPostRecoveryPrompt}
              />
            </div>
          )}

          {/* Save Error Notification */}
          {saveError && (
            <div className="pt-3 sm:pt-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start sm:items-center">
                  <div className="text-sm text-red-700 flex-1 min-w-0">
                    <strong>Save Error:</strong> {saveError}
                  </div>
                  <button
                    onClick={clearSaveError}
                    className="ml-2 sm:ml-auto text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    <span className="sr-only">Dismiss</span>
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Draft Error Notification */}
          {draftError && (
            <div className="pt-3 sm:pt-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start sm:items-center">
                  <div className="text-sm text-orange-700 flex-1 min-w-0">
                    <strong>Draft Storage:</strong> {draftError.message}
                    {draftError.type === 'quota_exceeded' && (
                      <div className="mt-1 text-xs">
                        Try clearing browser data or using a different browser.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={clearDraftError}
                    className="ml-2 sm:ml-auto text-orange-400 hover:text-orange-600 flex-shrink-0"
                  >
                    <span className="sr-only">Dismiss</span>
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions Error Notification */}
          {suggestionsError && (
            <div className="pt-3 sm:pt-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                <div className="flex items-start sm:items-center">
                  <div className="text-sm text-yellow-700 flex-1 min-w-0">
                    <strong>Suggestions Error:</strong> {suggestionsError}
                  </div>
                  <button
                    onClick={clearSuggestionsError}
                    className="ml-2 sm:ml-auto text-yellow-400 hover:text-yellow-600 flex-shrink-0"
                  >
                    <span className="sr-only">Dismiss</span>
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4">
          {/* Editor guidance info box */}
          {!isDismissed('editor-guidance') && (
            <InfoBox
              id="editor-guidance"
              type="tip"
              title="Editor Tips & AI Suggestions"
              content={
                <div className="space-y-2">
                  <p>Make the most of your writing experience:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Auto-save</strong> - Your changes are automatically saved as you type</li>
                    <li><strong>AI Suggestions</strong> - Submit for review to get intelligent feedback on grammar, style, and content</li>
                    <li><strong>Suggestion Types</strong> - Look for color-coded suggestions:
                      <span className="inline-block ml-1">
                        <span className="inline-block w-3 h-3 bg-blue-200 border border-blue-400 rounded mr-1"></span>LLM,
                        <span className="inline-block w-3 h-3 bg-purple-200 border border-purple-400 rounded mx-1"></span>Brand,
                        <span className="inline-block w-3 h-3 bg-orange-200 border border-orange-400 rounded mx-1"></span>Fact,
                        <span className="inline-block w-3 h-3 bg-green-200 border border-green-400 rounded mx-1"></span>Grammar,
                        <span className="inline-block w-3 h-3 bg-red-200 border border-red-400 rounded mx-1"></span>Spelling
                      </span>
                    </li>
                    <li><strong>Keyboard Shortcuts</strong> - Use Ctrl+S (Cmd+S) to manually save</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-2">
                    Ready to make your words betterer? Start writing! ✍️
                  </p>
                </div>
              }
              onDismiss={() => dismissInfoBox('editor-guidance')}
              className="mb-4"
            />
          )}

          <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 xl:gap-6">
            {/* Main editor area */}
            <div className="flex-1 min-w-0">
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                {/* Title Editor */}
                <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                  <TitleEditor
                    title={title}
                    onChange={handleTitleChange}
                    placeholder={isNewPost ? "Enter your title here" : "Enter your title here"}
                    maxLength={200}
                    disabled={isSaving}
                  />
                </div>

                {/* Content Editor */}
                <ContentEditor
                  content={content}
                  onChange={handleContentChange}
                  placeholder={isNewPost ? "Start writing your new blog post... Your content will be automatically saved as a draft while you write." : "Start writing your blog post..."}
                />
              </div>

              {/* Content Summary - positioned above suggestions but below editor */}
              {!isNewPost && (
                <div className="mt-3 sm:mt-4 xl:hidden">
                  <ContentSummary
                    summary={summary}
                    isLoading={suggestionsLoading}
                    className=""
                  />
                </div>
              )}

              {/* Suggestion panel below editor on mobile and tablet, hidden on desktop */}
              {hasActiveSuggestions && (
                <div className="mt-3 sm:mt-4 bg-white shadow-sm rounded-lg p-4 sm:p-6 xl:hidden">
                  <SuggestionsPanel
                    suggestions={suggestions}
                    content={content}
                    onAccept={handleAcceptSuggestion}
                    onReject={handleRejectSuggestion}
                    onDelete={handleDeleteSuggestion}
                    isLoading={suggestionsLoading}
                  />
                </div>
              )}
            </div>

            {/* Sidebar with suggestion stats - hidden on mobile/tablet, shown on desktop */}
            {(hasActiveSuggestions || stats.accepted > 0 || stats.rejected > 0 || (!isNewPost && summary)) && (
              <div className="hidden xl:block w-80 2xl:w-96 space-y-4 flex-shrink-0">
                <SuggestionStats
                  stats={stats}
                  onUndoClick={canUndo ? handleUndo : undefined}
                />

                {/* Content Summary - positioned above suggestions in desktop sidebar */}
                {!isNewPost && (
                  <ContentSummary
                    summary={summary}
                    isLoading={suggestionsLoading}
                    className=""
                  />
                )}

                {suggestionsLoading && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      <span className="text-sm text-gray-600">Loading suggestions...</span>
                    </div>
                  </div>
                )}

                {/* Desktop suggestion panel */}
                {hasActiveSuggestions && (
                  <div className="bg-white shadow-sm rounded-lg p-6">
                    <SuggestionsPanel
                      suggestions={suggestions}
                      content={content}
                      onAccept={handleAcceptSuggestion}
                      onReject={handleRejectSuggestion}
                      onDelete={handleDeleteSuggestion}
                      isLoading={suggestionsLoading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <EditorActions
          onSave={handleSave}
          onSubmitReview={handleSubmitReviewClick}
          onFinalize={handleFinalizeClick}
          isSaving={isSaving}
          isDirty={isDirty}
          canSubmit={title.trim().length > 0 && content.trim().length > 0}
          post={post}
          isReviewInProgress={isReviewInProgress}
          title={title}
          content={content}
          hasUnsavedChanges={hasAutoSaveUnsavedChanges}
          forceSave={forceSave}
          onPostCreated={(newPostId) => {
            // Update the post ID when a new post is created
            if (post) {
              setPost({ ...post, id: newPostId });
            }
          }}
        />
      </div>

      {/* Conflict Resolution Modal */}
      {conflictData && (
        <ConflictResolutionModal
          isOpen={true}
          conflictData={conflictData}
          onResolve={handleConflictResolution}
          onCancel={() => setConflictData(null)}
        />
      )}

      {/* Undo Notification */}
      {showUndoNotification && undoHistory.length > 0 && (
        <UndoNotification
          undoAction={undoHistory[0]}
          onUndo={handleUndo}
          onDismiss={() => setShowUndoNotification(false)}
        />
      )}

      {/* Review Notifications */}
      <ReviewNotificationContainer
        notifications={reviewNotifications}
        onDismiss={removeReviewNotification}
      />

      {/* Submit for Review Confirmation Modal */}
      <ConfirmationModal
        isOpen={showSubmitConfirmation}
        title="Submit for Review"
        message="This will submit your post for additional AI review and analysis. You may receive new suggestions to help improve your content. Are you sure you want to proceed?"
        confirmText="Submit for Review"
        cancelText="Cancel"
        type="info"
        icon="submit"
        onConfirm={handleSubmitReviewConfirmed}
        onCancel={() => setShowSubmitConfirmation(false)}
        isLoading={isSubmittingReview}
      />

      {/* Finalize Draft Confirmation Modal */}
      <ConfirmationModal
        isOpen={showFinalizeConfirmation}
        title="Finalize Draft"
        message="This will mark your post as complete and ready for publication. Once finalized, you won't be able to make further edits or receive additional suggestions. Are you sure you want to finalize this draft?"
        confirmText="Finalize Draft"
        cancelText="Cancel"
        type="success"
        icon="success"
        onConfirm={handleFinalizeConfirmed}
        onCancel={() => setShowFinalizeConfirmation(false)}
        isLoading={isFinalizing}
      />

      {/* Navigation Confirmation Modal */}
      <ConfirmationModal
        isOpen={showNavigationConfirmation}
        title={isNewPost ? "Discard New Post?" : "Unsaved Changes"}
        message={
          isNewPost
            ? "You have an unsaved new post that will be lost if you leave this page. Are you sure you want to discard it?"
            : "You have unsaved changes that will be lost if you leave this page. Are you sure you want to continue?"
        }
        confirmText={isNewPost ? "Discard Post" : "Leave Page"}
        cancelText="Stay Here"
        type="warning"
        icon="warning"
        onConfirm={handleNavigationConfirmed}
        onCancel={() => setShowNavigationConfirmation(false)}
      />
      </EditorErrorBoundary>
    </div>
  );
});

EditorPage.displayName = 'EditorPage';
