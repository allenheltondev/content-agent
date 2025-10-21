import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { BlogPost, Suggestion } from '../types';
import { apiService } from '../services/ApiService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useAutoSaveManager } from '../hooks/useAutoSaveManager';
// Local draft persistence disabled
import { useSuggestionManager } from '../hooks/useSuggestionManager';
import { usePageTitle } from '../hooks/usePageTitle';
import { EditorHeader } from '../components/editor/EditorHeader';
import { TitleEditor } from '../components/editor/TitleEditor';
import { ContentEditorWithSuggestions } from '../components/editor/ContentEditorWithSuggestions';
import { EditorActions } from '../components/editor/EditorActions';
import { ContentSummary } from '../components/editor/ContentSummary';
import { MainEditorLayout } from '../components/editor/MainEditorLayout';
import { UndoNotification } from '../components/editor/UndoNotification';
import { EditorSkeleton } from '../components/editor/EditorSkeleton';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { AppHeader } from '../components/common';
import { ConflictResolutionModal } from '../components/editor/ConflictResolutionModal';

import { useAsyncReview } from '../hooks/useAsyncReview';
import { applyResolution, type ConflictData, type ConflictResolution } from '../utils/conflictResolution';
import { EditorErrorBoundary } from '../components/editor/EditorErrorBoundary';
import { EditorFallbackUI } from '../components/editor/EditorFallbackUI';
import { ErrorReportingManager } from '../utils/errorReporting';
import { EditorBackupManager } from '../utils/editorBackup';
import { useRenderPerformanceMonitor } from '../hooks/useRenderPerformanceMonitor';
import { EditorModeProvider, useEditorMode } from '../contexts/EditorModeContext';
import { ModeToggleButton } from '../components/editor/ModeToggleButton';
import { SkipLinks } from '../components/accessibility/SkipLinks';
import { AccessibilitySettings } from '../components/accessibility/AccessibilitySettings';


// Inner component that uses the EditorModeProvider context
const EditorPageContent = memo(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { isLoading: isAuthLoading, isInitialized, isAuthenticated } = useAuth();

  // Editor mode context
  const {
    currentMode,
    markContentChanged,
    switchToEditMode,
    switchToReviewMode,
    isTransitioning,
  } = useEditorMode();

  // Check if this is a new post - memoize to prevent re-calculations
  const isNewPost = useMemo(() => id === 'new', [id]);

  // Integration testing and monitoring
  useEffect(() => {
    // Simplified initialization - no complex health checks needed
    const performIntegrationCheck = async () => {
      try {
        // Editor page initialized successfully
      } catch (error) {
        console.error('Editor initialization failed:', error);
      }
    };

    // Perform check after a short delay to allow component to fully initialize
    const integrationCheckTimeout = setTimeout(performIntegrationCheck, 2000);

    // Timeout will be cleaned up by React

    return () => clearTimeout(integrationCheckTimeout);
  }, []);

  // Comprehensive cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup handled by React
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
  // const [hasDraftToRecover, setHasDraftToRecover] = useState(false);

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

  // Accessibility settings modal
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);

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

  // Draft persistence removed



  // Handle content changes - memoized to prevent unnecessary re-renders
  const handleContentChange = useCallback((newContent: string) => {
    const oldContent = content;
    setContent(newContent);
    setIsDirty(true);

    // Track content changes for mode toggle functionality
    if (currentMode === 'edit') {
      markContentChanged();
      // Also track the actual content diff for suggestion recalculation
      if (oldContent !== newContent) {
        // The context will handle the diff calculation
        markContentChanged();
      }
    }
  }, [content, currentMode, markContentChanged]);

  // Handle title changes - memoized to prevent unnecessary re-renders
  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
  }, []);

  // Suggestion management hook - disabled for new posts
  // Memoize the config to prevent unnecessary re-renders
  const suggestionConfig = useMemo(() => ({
    postId: isNewPost ? '' : (id || ''),
    maxUndoHistory: 10,
    persistState: true,
    autoSaveOnAccept: true,
    onSuccess: (_action: string, _suggestionId: string) => {},
    onError: (error: string, _action: string, _suggestionId: string) => {
      showError(error);
    }
  }), [id, isNewPost, showSuccess, showError]);

  const {
    suggestions,
    summary,
    error: suggestionsError,
    undoHistory,
    loadSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    undoLastAcceptance,
    clearError: clearSuggestionsError,
    hasActiveSuggestions
  } = useSuggestionManager(content, handleContentChange, suggestionConfig);

  // Update parent component's suggestions state when they change
  useEffect(() => {
    // This will be handled by a callback from parent
    // For now, we'll use a custom event to communicate with parent
    const event = new CustomEvent('suggestionsUpdated', {
      detail: { suggestions, content }
    });
    window.dispatchEvent(event);
  }, [suggestions, content]);

  // Review hook - for real-time AI analysis
  const {
    isReviewInProgress,
    startReview,
    canStartReview
  } = useAsyncReview({
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    onReviewComplete: () => {
      // Refresh suggestions when review completes
      if (!isNewPost && post) {
        loadSuggestions();
        // Suppress success toast
      }
    },
    onReviewError: (error) => {
      showError(`Review failed: ${error}`);
    }
  });

  // Combined saving state - memoized to prevent re-renders
  const isSaving = useMemo(() => isAutoSaving || isCreatingPost, [isAutoSaving, isCreatingPost]);

  // Track if suggestions are loading to prevent UI jumping
  const [areSuggestionsLoading, setAreSuggestionsLoading] = useState(false);

  // Combined loading state that includes suggestions loading
  const isFullyLoading = useMemo(() => {
    return isLoading || areSuggestionsLoading;
  }, [isLoading, areSuggestionsLoading]);

  // Load post data on mount
  useEffect(() => {
    const loadPost = async () => {
      // Wait until auth is fully initialized to avoid 401s on refresh
      if (isAuthLoading || !isInitialized) {
        return;
      }

      // If not authenticated, ProtectedRoute will handle redirect; avoid work here
      if (!isAuthenticated) {
        return;
      }
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

        // Use server version only (local draft disabled)
        setTitle(loadedPost.title);
        setContent(loadedPost.body);

        // Load suggestions for existing posts and track loading state
        if (loadedPost.status === 'draft' || loadedPost.status === 'review') {
          setAreSuggestionsLoading(true);
          try {
            await loadSuggestions();
          } finally {
            setAreSuggestionsLoading(false);
          }
        }
      } catch (error) {
        console.error('Failed to load post:', error);
        // Show error but do NOT redirect away; keep user on editor route
        const msg = (error && typeof error === 'object' && 'message' in (error as any))
          ? (error as any).message
          : 'Failed to load post';
        showError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    loadPost();
  }, [id, navigate, showError, isNewPost, loadSuggestions, isAuthLoading, isInitialized, isAuthenticated]);

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
  }, [post, isDirty, isNewPost, title, content, forceSave, showSuccess, showError, navigate]);

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

      // Ctrl/Cmd + M for mode toggle (only for existing posts)
      if ((e.ctrlKey || e.metaKey) && e.key === 'm' && !isNewPost && !isTransitioning) {
        e.preventDefault();
        if (currentMode === 'edit') {
          switchToReviewMode();
        } else {
          switchToEditMode();
        }
      }
    };

    // Event listener will be cleaned up by React
    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, isSaving, handleSave, isNewPost, isTransitioning, currentMode, switchToEditMode, switchToReviewMode]);

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

    // Event listener will be cleaned up by React
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, isNewPost, title, content]);

  // Handle suggestion acceptance
  const handleAcceptSuggestion = useCallback(async (suggestionId: string) => {
    try {
      await acceptSuggestion(suggestionId);
      setShowUndoNotification(true);
    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      // Error handling is now done by the suggestion manager hook
    }
  }, [acceptSuggestion]);

  // Handle suggestion rejection
  const handleRejectSuggestion = useCallback(async (suggestionId: string) => {
    try {
      await rejectSuggestion(suggestionId);
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      // Error handling is now done by the suggestion manager hook
    }
  }, [rejectSuggestion]);

  // Suggestion deletion handled within suggestion manager when needed

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
    navigate('/dashboard');
  }, [navigate, isNewPost]);

  // Clear suggestions error when user dismisses
  useEffect(() => {
    if (suggestionsError) {
      const timer = setTimeout(() => {
        clearSuggestionsError();
      }, 5000);

      // Timeout will be cleaned up by React

      return () => clearTimeout(timer);
    }
  }, [suggestionsError]);

  // Handle conflict resolution from modal
  const handleConflictResolution = useCallback((resolution: ConflictResolution) => {
    if (!conflictData) {
      return;
    }

    const result = applyResolution(conflictData, resolution);
    setTitle(result.title);
    setContent(result.content);
    setConflictData(null);
    setIsDirty(true);
    showSuccess('Conflict resolved. Please save your changes.');
  }, [conflictData, showSuccess]);

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

      // Determine canonical post ID from route (fallback to state)
      const postIdToUse = (id && id !== 'new') ? id : (post?.id ? String(post.id) : '');
      if (!postIdToUse) {
        showError('No post ID found for review');
        return;
      }

      // Call the review endpoint and start polling
      await startReview(String(postIdToUse));

      showSuccess('Review started! You\'ll receive real-time writing improvements.');
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

      await apiService.finalizeDraft(String(post.id));
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

  // Render loading skeleton while maintaining AppHeader
  if (isFullyLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Professional App Header - always renders immediately */}
        <AppHeader
          editorContext={{
            isNewPost,
            postTitle: title.trim() || undefined,
            isDirty: false, // No changes during loading
            onNavigateBack: handleNavigateBack
          }}
        />

        {/* Editor Skeleton */}
        <EditorSkeleton isNewPost={isNewPost} />
      </div>
    );
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
      {/* Skip Links for Accessibility */}
      <SkipLinks />

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
        fallback={
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6">
            <EditorFallbackUI
              error={new Error('Editor encountered an error')}
              onRetry={() => window.location.reload()}
              onSaveBackup={() => {
                // Save backup logic would go here
                console.log('Saving backup...');
              }}
              postId={id || null}
              title={title}
              content={content}
              componentName="Editor Page"
            />
          </div>
        }
      >
        {/* Smooth transition container for editor content */}
        <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <EditorHeader
            isSaving={isSaving}
            isDirty={isDirty}
            lastSaved={lastSaved}
            onSave={handleSave}
            isNewPost={isNewPost}
          />

          {/* Mode Toggle Button and Accessibility Settings - only show for existing posts */}
          {!isNewPost && (
            <div className="px-3 sm:px-4 lg:px-6 xl:px-8 flex items-center space-x-3">
              <ModeToggleButton />

              {/* Accessibility Settings Button */}
              <button
                onClick={() => setShowAccessibilitySettings(true)}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md transition-colors"
                aria-label="Open accessibility settings"
                title="Accessibility settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Notifications removed */}


        <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4">


          {/* Content Summary - positioned above main content area */}
          {!isNewPost && (
            <ContentSummary
              summary={summary}
              isLoading={areSuggestionsLoading}
              position="above-content"
              prominence="medium"
              className="mb-6"
            />
          )}

          <MainEditorLayout
            hasSuggestions={false}
            sidebar={
              <></>
            }
          >
            {/* Main editor area */}
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

              {/* Content Editor with Suggestions */}
              <ContentEditorWithSuggestions
                content={content}
                suggestions={suggestions}
                onChange={handleContentChange}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
                placeholder={isNewPost ? "Start writing your new blog post..." : "Start writing your blog post..."}
                disabled={isSaving}
                showSuggestions={!isNewPost && hasActiveSuggestions}
                // Mode-aware props - explicitly pass from context
                editorMode={currentMode}
                isTransitioning={isTransitioning}
                suggestionVersion={1} // Context will track this
                onSuggestionRecalculation={async () => {
                  // Trigger suggestion reload when switching to Review mode
                  if (!isNewPost && post) {
                    await loadSuggestions();
                  }
                }}
              />
            </div>
          </MainEditorLayout>
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

      {/* Review notifications removed */}

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

      {/* Accessibility Settings Modal */}
      <AccessibilitySettings
        isOpen={showAccessibilitySettings}
        onClose={() => setShowAccessibilitySettings(false)}
      />
      </EditorErrorBoundary>
    </div>
  );
});

EditorPageContent.displayName = 'EditorPageContent';

// Main EditorPage component with EditorModeProvider
export const EditorPage = memo(() => {
  const { id } = useParams<{ id: string }>();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);


  // Listen for suggestions updates from child component
  useEffect(() => {
    const handleSuggestionsUpdate = (event: CustomEvent) => {
      const { suggestions: newSuggestions } = event.detail;
      setSuggestions(newSuggestions);
    };

    window.addEventListener('suggestionsUpdated', handleSuggestionsUpdate as EventListener);
    return () => {
      window.removeEventListener('suggestionsUpdated', handleSuggestionsUpdate as EventListener);
    };
  }, []);

  // Handle suggestion recalculation callback
  const handleSuggestionRecalculation = useCallback(async (_content: string, _currentSuggestions: Suggestion[]) => {

    // If this is a new post, no suggestions to recalculate
    if (!id || id === 'new') {
      return [];
    }

    try {
      // Start a new review to get updated suggestions based on content changes
      await apiService.startReview(id);

      console.log('Started suggestion recalculation for post:', id);

      // Return the current suggestions - they will be updated via the suggestions manager
      return suggestions;
    } catch (error) {
      console.error('Failed to start suggestion recalculation:', error);
      // Return current suggestions on error
      return suggestions;
    }
  }, [id, suggestions]);

  return (
    <EditorModeProvider
      onSuggestionRecalculation={handleSuggestionRecalculation}
      currentSuggestions={suggestions}
      postId={id && id !== 'new' ? id : undefined}
    >
      <EditorPageContent />
    </EditorModeProvider>
  );
});

EditorPage.displayName = 'EditorPage';
