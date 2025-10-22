import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { BlogPost, Suggestion, SuggestionType } from '../types';
import { apiService } from '../services/ApiService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { useAutoSaveManager } from '../hooks/useAutoSaveManager';
// Local draft persistence disabled

import { usePageTitle } from '../hooks/usePageTitle';
import { EditorHeader } from '../components/editor/EditorHeader';
import { TitleEditor } from '../components/editor/TitleEditor';
import { EditorActions } from '../components/editor/EditorActions';

import { UndoNotification } from '../components/editor/UndoNotification';
import { EditorSkeleton } from '../components/editor/EditorSkeleton';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { AppHeader } from '../components/common';
import { ConflictResolutionModal } from '../components/editor/ConflictResolutionModal';
import { SimpleSuggestionHighlights } from '../components/editor/SimpleSuggestionHighlights';
import { ContentSummary } from '../components/editor/ContentSummary';

import { useAsyncReview } from '../hooks/useAsyncReview';
import { applyResolution, type ConflictData, type ConflictResolution } from '../utils/conflictResolution';
import { EditorErrorBoundary } from '../components/editor/EditorErrorBoundary';
import { EditorFallbackUI } from '../components/editor/EditorFallbackUI';
import { ErrorReportingManager } from '../utils/errorReporting';
import { EditorBackupManager } from '../utils/editorBackup';
import { useRenderPerformanceMonitor } from '../hooks/useRenderPerformanceMonitor';
import { ReviewProgressNotification } from '../components/editor/ReviewProgressNotification';
import { useReviewProgress } from '../hooks/useReviewProgress';
import { useSuggestionNavigation } from '../hooks/useSuggestionNavigation';
import { SuggestionStats } from '../components/editor/SuggestionStats';
import { DraggableActiveSuggestionArea } from '../components/editor/DraggableActiveSuggestionArea';
import { applySuggestionWithOffsetRecalculation } from '../utils/suggestionOffsetCalculation';





// Inner component that uses the EditorModeProvider context
const EditorPageContent = memo(() => {
  const { id } = useParams<{ id: string; }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { isLoading: isAuthLoading, isInitialized, isAuthenticated } = useAuth();

  // Simple mode state - no complex context
  const [currentMode, setCurrentMode] = useState<'edit' | 'review'>('edit');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hasInitiallyLoadedSuggestions, setHasInitiallyLoadedSuggestions] = useState(false);

  // All posts are existing posts now - new posts are created via modal
  const isNewPost = false;

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

  // Check if post is in read-only mode (Complete status)
  const isReadOnlyMode = post?.status === 'Complete';

  // Set page title based on post state
  usePageTitle(title.trim() || 'Editor');
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  // const [hasDraftToRecover, setHasDraftToRecover] = useState(false);

  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [, setInitialLoadTimestamp] = useState<number>(0);
  const [showUndoNotification, setShowUndoNotification] = useState(false);

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
    postId: id || null,
    title,
    content,
    onSaveSuccess: (savedPost) => {
      setPost(savedPost);
      setIsDirty(false);
      // Don't update title/content here - let the user's current edits remain
      // The saved post reflects what was saved, but user might have continued typing
    },
    onSaveError: (error) => {
      showError(`Auto-save failed: ${error}`);
    },
    enabled: true
  });

  // Draft persistence removed



  // Handle content changes - memoized to prevent unnecessary re-renders
  // Simplified content change handler - no complex interactions
  const handleContentChange = useCallback((newContent: string) => {
    // Prevent content changes in read-only mode
    if (isReadOnlyMode) {
      showError('Cannot edit content of a completed post.');
      return;
    }

    setContent(newContent);
    setIsDirty(true);
  }, [isReadOnlyMode, showError]);

  // Handle title changes - memoized to prevent unnecessary re-renders
  const handleTitleChange = useCallback((newTitle: string) => {
    // Prevent title changes in read-only mode
    if (isReadOnlyMode) {
      showError('Cannot edit title of a completed post.');
      return;
    }

    setTitle(newTitle);
    setIsDirty(true);
  }, [isReadOnlyMode, showError]);



  // Simple suggestion state - no complex manager
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [_expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);

  // Summary state
  const [summary, setSummary] = useState<string | null>(null);

  // Simple undo functionality
  const [undoHistory, setUndoHistory] = useState<any[]>([]);

  // Suggestion navigation hook
  const suggestionNavigation = useSuggestionNavigation(suggestions, {
    autoAdvance: true,
    loopNavigation: false,
    onSuggestionChange: (suggestion, _index) => {
      // Update expanded suggestion when navigation changes
      setExpandedSuggestion(suggestion?.id || null);
    }
  });



  // Calculate suggestion stats
  const suggestionStats = useMemo(() => {
    // Safety check: ensure suggestions is an array
    const safeSuggestions = Array.isArray(suggestions) ? suggestions : [];

    const byType = safeSuggestions.reduce((acc, suggestion) => {
      acc[suggestion.type] = (acc[suggestion.type] || 0) + 1;
      return acc;
    }, {} as Record<SuggestionType, number>);

    return {
      total: safeSuggestions.length,
      accepted: 0, // These would be tracked if we had accepted/rejected history
      rejected: 0,
      canUndo: undoHistory.length > 0,
      byType
    };
  }, [suggestions, undoHistory.length]);

  // Simple suggestion functions
  const loadSuggestions = useCallback(async () => {
    if (!post?.id) return;

    try {
      setIsLoadingSuggestions(true);
      const response = await apiService.getSuggestions(post.id);

      // Extract suggestions array from response object
      const loadedSuggestions = response?.suggestions || response || [];

      // Extract summary from response
      const loadedSummary = response?.summary || null;

      // Safety check: ensure we always set an array
      const safeSuggestions = Array.isArray(loadedSuggestions) ? loadedSuggestions : [];
      setSuggestions(safeSuggestions);
      setSummary(loadedSummary);

      // Automatically validate positions after initial loading (immediate)
      if (safeSuggestions.length > 0 && !hasInitiallyLoadedSuggestions) {
        // Run immediately without delay
        refreshSuggestionPositions();
        setHasInitiallyLoadedSuggestions(true);
      }

      return safeSuggestions;
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      setSuggestionsError('Failed to load suggestions');
      setSuggestions([]);
      setSummary(null);
      return [];
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [post?.id]);

  // Validate and refresh suggestion positions (completely silent)
  const refreshSuggestionPositions = useCallback(async () => {
    if (suggestions.length === 0) return;

    try {
      const { validateSuggestionOffsets } = await import('../utils/suggestionOffsetCalculation');
      const validatedSuggestions = validateSuggestionOffsets(suggestions, content);

      if (validatedSuggestions.length !== suggestions.length) {
        setSuggestions(validatedSuggestions);
      } else {
        // Check if any suggestions were corrected (same count but different positions)
        const hasChanges = suggestions.some((original, index) => {
          const validated = validatedSuggestions[index];
          return validated && (
            validated.startOffset !== original.startOffset ||
            validated.endOffset !== original.endOffset ||
            validated.textToReplace !== original.textToReplace
          );
        });

        if (hasChanges) {
          setSuggestions(validatedSuggestions);
        }
      }
    } catch (error) {
      console.error('Error during silent position validation:', error);
      // Fail silently - don't show any error to user
    }
  }, [suggestions, content]);

  // Silently validate positions whenever suggestions or content changes
  useEffect(() => {
    if (suggestions.length > 0 && content && currentMode === 'review') {
      // Small delay to ensure content is stable
      const timeoutId = setTimeout(() => {
        refreshSuggestionPositions();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [suggestions.length, content.length, currentMode, refreshSuggestionPositions]);

  const acceptSuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion || !post?.id) return;

    try {
      // Store original content for undo
      const originalContent = content;

      // Get remaining suggestions (excluding the one being accepted)
      const remainingSuggestions = suggestions.filter(s => s.id !== suggestionId);

      // Apply suggestion and recalculate offsets for remaining suggestions
      const { newContent, updatedSuggestions } = applySuggestionWithOffsetRecalculation(
        content,
        suggestion,
        remainingSuggestions
      );

      // Update content
      handleContentChange(newContent);

      // Update suggestions with recalculated offsets
      setSuggestions(updatedSuggestions);

      // Add to undo history
      const undoAction = {
        id: `undo-${Date.now()}`,
        suggestionId,
        originalContent,
        newContent,
        suggestion,
        timestamp: Date.now()
      };
      setUndoHistory(prev => [undoAction, ...prev.slice(0, 9)]); // Keep max 10 items

      // Handle auto-advance navigation
      suggestionNavigation.handleSuggestionResolved(suggestionId);

      // Update suggestion status to 'accepted' in backend
      await apiService.updateSuggestionStatus(post.id, suggestionId, 'accepted');

      // Automatically validate remaining suggestion positions immediately
      if (updatedSuggestions.length > 0) {
        // Use requestAnimationFrame to ensure DOM is updated first
        requestAnimationFrame(() => {
          refreshSuggestionPositions();
        });
      }


    } catch (error) {
      console.error('Failed to accept suggestion:', error);
      // Could show error toast here if needed
    }
  }, [suggestions, content, handleContentChange, post?.id, suggestionNavigation]);

  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    if (!post?.id) return;

    try {
      // Remove suggestion from list
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

      // Handle auto-advance navigation
      suggestionNavigation.handleSuggestionResolved(suggestionId);

      // Update suggestion status to 'rejected' in backend
      await apiService.updateSuggestionStatus(post.id, suggestionId, 'rejected');
    } catch (error) {
      console.error('Failed to reject suggestion:', error);
      // Could show error toast here if needed
    }
  }, [post?.id, suggestionNavigation]);



  const undoLastAcceptance = useCallback(() => {
    if (undoHistory.length === 0) return;

    const lastAction = undoHistory[0];

    // Restore the original content
    handleContentChange(lastAction.originalContent);

    // Restore the suggestion that was accepted
    const restoredSuggestion = lastAction.suggestion;
    setSuggestions(prev => {
      // Add the suggestion back and sort by startOffset to maintain order
      const updatedSuggestions = [...prev, restoredSuggestion].sort(
        (a, b) => a.startOffset - b.startOffset
      );
      return updatedSuggestions;
    });

    // Remove from undo history
    setUndoHistory(prev => prev.slice(1));

    // Validate positions after undo since content changed
    requestAnimationFrame(() => {
      refreshSuggestionPositions();
    });


  }, [undoHistory, handleContentChange]);



  // Simple mode toggle functions
  const switchToEditMode = useCallback(async () => {
    // Prevent switching to edit mode if post is finalized
    if (isReadOnlyMode) {
      showError('Cannot edit a completed post. Only review mode is available.');
      return;
    }

    setIsTransitioning(true);
    setCurrentMode('edit');
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isReadOnlyMode, showError]);

  const switchToReviewMode = useCallback(async () => {
    setIsTransitioning(true);
    setCurrentMode('review');

    // Immediately validate suggestion positions when entering review mode
    // Do this silently without any visual indicators
    if (suggestions.length > 0) {
      // Import and run validation immediately, no delays
      const { validateSuggestionOffsets } = await import('../utils/suggestionOffsetCalculation');
      const validatedSuggestions = validateSuggestionOffsets(suggestions, content);

      // Update suggestions silently if needed
      if (validatedSuggestions.length !== suggestions.length ||
        suggestions.some((original, index) => {
          const validated = validatedSuggestions[index];
          return validated && (
            validated.startOffset !== original.startOffset ||
            validated.endOffset !== original.endOffset ||
            validated.textToReplace !== original.textToReplace
          );
        })) {
        setSuggestions(validatedSuggestions);
      }
    }

    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
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
      }
      // Reset progress notification when review completes
      resetProgress();
      // Switch to review mode to show the suggestions
      switchToReviewMode();
    },
    onReviewError: (error) => {
      showError(`Review failed: ${error}`);
      // Reset progress notification on error
      resetProgress();
    }
  });

  // Progress notification management
  const { isDismissed, dismissProgress, resetProgress } = useReviewProgress();

  // Combined saving state - memoized to prevent re-renders
  const isSaving = useMemo(() => isAutoSaving, [isAutoSaving]);

  // Track if suggestions are loading to prevent UI jumping
  const [_areSuggestionsLoading, _setAreSuggestionsLoading] = useState(false);

  // Only show skeleton for initial page load
  const isFullyLoading = useMemo(() => {
    return isLoading && !post;
  }, [isLoading, post]);

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

      // Reset the initial suggestions flag when loading a new post
      setHasInitiallyLoadedSuggestions(false);

      // Load existing post
      try {
        setIsLoading(true);
        const loadedPost = await apiService.getPost(id);
        setPost(loadedPost);
        setInitialLoadTimestamp(Date.now());

        // Use server version only (local draft disabled)
        setTitle(loadedPost.title);
        setContent(loadedPost.body);

        // Force Review mode for Complete posts
        if (loadedPost.status === 'Complete') {
          setCurrentMode('review');
        }

        // Always try to load suggestions for existing posts
        setIsLoadingSuggestions(true);
        try {
          const response = await apiService.getSuggestions(loadedPost.id);

          // Extract suggestions array from response object
          const loadedSuggestions = response?.suggestions || response || [];

          // Extract summary from response
          const loadedSummary = response?.summary || null;

          // Safety check: ensure we always set an array
          const safeSuggestions = Array.isArray(loadedSuggestions) ? loadedSuggestions : [];
          setSuggestions(safeSuggestions);
          setSummary(loadedSummary);
        } catch (error) {
          console.error('Failed to load suggestions:', error);
          setSuggestionsError('Failed to load suggestions');
          setSuggestions([]); // Ensure it's an empty array on error
          setSummary(null); // Clear summary on error
        } finally {
          setIsLoadingSuggestions(false);
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
  }, [id, navigate, showError, isAuthLoading, isInitialized, isAuthenticated]);

  // Manual save (force save)
  const handleSave = useCallback(async () => {
    if (!post || !isDirty) return;

    try {
      await forceSave();
      showSuccess('Post saved successfully');
    } catch (error) {
      console.error('Failed to save post:', error);
      showError('Failed to save post');
    }
  }, [post, isDirty, forceSave, showSuccess, showError]);

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

      // Ctrl/Cmd + M for mode toggle (disabled for finalized posts)
      if ((e.ctrlKey || e.metaKey) && e.key === 'm' && !isTransitioning && !isReadOnlyMode) {
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
  }, [isDirty, isSaving, handleSave, isTransitioning, currentMode, isReadOnlyMode, switchToEditMode, switchToReviewMode]);

  // Clear save errors when user starts typing
  useEffect(() => {
    if (saveError && (isDirty || content || title)) {
      clearSaveError();
    }
  }, [saveError, isDirty, content, title]);



  // Auto-switch to review mode when suggestions are loaded (only on initial load)
  useEffect(() => {
    // Only auto-switch if we have suggestions, we're in edit mode, not loading, not transitioning,
    // not in read-only mode, and this is the first time we're loading suggestions for this page session
    const suggestionCount = Array.isArray(suggestions) ? suggestions.length : 0;
    if (suggestionCount > 0 && currentMode === 'edit' && !isLoadingSuggestions && !isLoading && !isTransitioning && !hasInitiallyLoadedSuggestions && !isReadOnlyMode) {
      // Mark that we've initially loaded suggestions to prevent future auto-switches
      setHasInitiallyLoadedSuggestions(true);

      // Small delay to ensure suggestions are rendered and page is stable
      const timer = setTimeout(() => {
        switchToReviewMode();

        // Scroll to suggestions area on mobile/tablet after mode switch
        setTimeout(() => {
          const suggestionsElement = document.querySelector('[data-suggestions-panel]');
          if (suggestionsElement && window.innerWidth < 1280) { // xl breakpoint
            suggestionsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 400); // Delay for mode switch animation
      }, 300); // Longer delay for page load stability

      return () => clearTimeout(timer);
    }
  }, [suggestions, currentMode, isLoadingSuggestions, isLoading, isTransitioning, hasInitiallyLoadedSuggestions, isReadOnlyMode, switchToReviewMode]);

  // Warn user about unsaved changes when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);



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
    if (isDirty) {
      setShowNavigationConfirmation(true);
    } else {
      navigate('/dashboard');
    }
  }, [isDirty, navigate]);

  // Confirm navigation away from unsaved changes
  const handleNavigationConfirmed = useCallback(() => {
    setShowNavigationConfirmation(false);
    navigate('/dashboard');
  }, [navigate]);

  // Clear suggestions error when user dismisses
  useEffect(() => {
    if (suggestionsError) {
      const timer = setTimeout(() => {
        setSuggestionsError(null);
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
  const validateWorkflowAction = (): { isValid: boolean; error?: string; } => {
    if (!post) {
      return { isValid: false, error: 'No post loaded' };
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

    if (post.status === 'Complete') {
      return { isValid: false, error: 'This post has already been completed' };
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

      // Reset progress notification for new review
      resetProgress();

      // Call the review endpoint and start polling
      await startReview(String(postIdToUse));

      showSuccess('Review submitted! Analysis is starting - stay on this page to see suggestions as they arrive.');
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

      // Use the new updatePostStatus API endpoint
      await apiService.updatePostStatus(String(post.id), 'Complete');

      // Update local post state to reflect the new status
      setPost(prevPost => prevPost ? { ...prevPost, status: 'Complete' } : null);

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
            isNewPost: false,
            postTitle: title.trim() || undefined,
            isDirty: false, // No changes during loading
            onNavigateBack: handleNavigateBack
          }}
        />

        {/* Editor Skeleton */}
        <EditorSkeleton isNewPost={false} />
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
    <div className="h-screen bg-gray-50 flex flex-col">


      {/* Professional App Header */}
      <AppHeader
        editorContext={{
          isNewPost: false,
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
        <div className="max-w-7xl mx-auto animate-in fade-in duration-300 flex-1 flex flex-col">
          {/* Completion Banner for finalized posts */}
          {isReadOnlyMode && (
            <div className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
              <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4">
                <div className="flex items-center justify-center space-x-3">

                  <div className="text-center">
                    <h2 className="text-lg font-semibold">✨ Post Complete ✨</h2>
                    <p className="text-green-100 text-sm mt-1">
                      This post has been completed and is ready for publication. No further editing or suggestions are available.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Header with inline mode toggle - only show for draft posts */}
          {!isReadOnlyMode && (
            <div className="w-full bg-white border-b border-gray-200 shadow-sm">
              <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-4">
                <div className="flex items-center justify-between w-full">
                  {/* Left side - Editor Header */}
                  <EditorHeader
                    isSaving={isSaving}
                    isDirty={isDirty}
                    lastSaved={lastSaved}
                    onSave={handleSave}
                    isNewPost={false}
                  />

                  {/* Right side - Mode Toggle */}
                  <div className="flex items-center bg-gray-100 rounded-xl p-1.5 shadow-sm">
                    <button
                      onClick={switchToEditMode}
                      disabled={isTransitioning || isReadOnlyMode}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${currentMode === 'edit'
                        ? 'bg-blue-600 text-white shadow-md'
                        : isReadOnlyMode
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      title={isReadOnlyMode ? 'Editing is disabled for completed posts' : 'Switch to Edit mode'}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={switchToReviewMode}
                      disabled={isTransitioning}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${currentMode === 'review'
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                      🔍 Review
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simple header for finalized posts */}
          {isReadOnlyMode && (
            <div className="w-full bg-gray-50 border-b border-gray-200">
              <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-3">
                <div className="flex items-center justify-center">
                  <span className="text-gray-600 text-sm font-medium">📖 Read-Only View</span>
                </div>
              </div>
            </div>
          )}

          {/* Notifications removed */}


          <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4 flex-1 flex flex-col">




            <div className="flex-1">
              {/* Main editor area */}
              <div className={`shadow-sm rounded-lg overflow-hidden h-full flex flex-col ${isReadOnlyMode
                ? 'bg-gray-50 border-2 border-gray-200'
                : 'bg-white'
                }`}>
                {/* Title Editor */}
                <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                  <TitleEditor
                    title={title}
                    onChange={handleTitleChange}
                    placeholder={isReadOnlyMode ? "This post is completed and cannot be edited." : "Enter your title here"}
                    maxLength={200}
                    disabled={isSaving || isReadOnlyMode}
                  />
                </div>

                {/* Content Editor with Mode Support */}
                <div className="px-4 sm:px-6 pb-4 sm:pb-6 relative flex-1 flex flex-col">
                  {/* Mode transition overlay */}
                  {isTransitioning && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
                      <div className="flex items-center space-x-2 text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm font-medium">
                          Switching to {currentMode === 'review' ? 'Review' : 'Edit'} mode...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Content Editor */}
                  <div className="relative flex-1 flex flex-col">
                    {isReadOnlyMode ? (
                      /* Read-Only Mode: Simple content display for completed posts */
                      <div className="w-full flex-1 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="max-w-none prose prose-gray">
                          <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 bg-white p-6 rounded-lg border border-gray-200 shadow-sm min-h-[400px]">
                            {content || 'No content available.'}
                          </div>
                        </div>

                        {/* Read-only indicators */}
                        <div className="flex items-center justify-center mt-4 text-gray-500 text-sm">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                          This content is locked and cannot be modified
                        </div>
                      </div>
                    ) : currentMode === 'edit' ? (
                      /* Edit Mode: Textarea */
                      <textarea
                        value={content}
                        onChange={(e) => handleContentChange(e.target.value)}
                        placeholder="Start writing your blog post..."
                        disabled={isSaving || isTransitioning}
                        className="w-full flex-1 p-4 text-gray-900 placeholder-gray-400 border-none outline-none focus:ring-0 resize-none font-mono text-sm leading-relaxed bg-transparent"
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
                        }}
                      />
                    ) : (
                      /* Review Mode: Layout with suggestions panel and highlighted text */
                      <div className="w-full flex-1 flex flex-col lg:flex-row gap-4">
                        {/* Left side: Suggestion stats and navigation */}
                        <div className="lg:w-80 flex-shrink-0 space-y-4">
                          {/* Suggestion Stats */}
                          <SuggestionStats
                            stats={suggestionStats}
                            onUndoClick={undoHistory.length > 0 ? undoLastAcceptance : undefined}
                          />

                          {/* Content Summary */}
                          <ContentSummary
                            summary={summary || undefined}
                            isLoading={isLoadingSuggestions}
                            position="sidebar"
                            prominence="medium"
                          />

                        </div>

                        {/* Right side: Highlighted Text */}
                        <div className="flex-1 p-4 bg-gray-50 overflow-auto rounded-lg">
                          <SimpleSuggestionHighlights
                            suggestions={suggestions}
                            activeSuggestionId={suggestionNavigation.currentSuggestion?.id || null}
                            content={content}
                            onHighlightClick={(suggestionId) => {
                              suggestionNavigation.navigateToSuggestion(suggestionId);
                            }}
                            onAccept={acceptSuggestion}
                            onReject={rejectSuggestion}
                            className="font-mono text-sm leading-relaxed"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Draggable Active Suggestion Area - appears in review mode for draft posts only */}
                  {currentMode === 'review' && !isReadOnlyMode && suggestionNavigation.currentSuggestion && (
                    <DraggableActiveSuggestionArea
                      key="draggable-suggestion-area"
                      activeSuggestion={suggestionNavigation.currentSuggestion}
                      totalSuggestions={suggestionNavigation.totalCount}
                      currentIndex={suggestionNavigation.currentIndex}
                      onNavigate={suggestionNavigation.navigate}
                      onAccept={acceptSuggestion}
                      onReject={rejectSuggestion}
                      onEdit={(_suggestionId, _newText) => {
                        // Handle edit functionality if needed
                      }}
                      isProcessing={false}
                      fullContent={content}
                      onSuggestionResolved={suggestionNavigation.handleSuggestionResolved}
                    />
                  )}

                  {/* Loading suggestions indicator */}
                  {isLoadingSuggestions && (
                    <div className="mt-2 flex items-center text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                      Loading suggestions...
                    </div>
                  )}



                  {/* Suggestions error */}
                  {suggestionsError && (
                    <div className="mt-2 text-sm text-red-600">
                      {suggestionsError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons for draft posts or simple navigation for completed posts */}
          {isReadOnlyMode ? (
            <div className="bg-white border-t border-gray-200 px-3 sm:px-4 lg:px-6 xl:px-8 py-4">
              <div className="flex items-center justify-center">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <EditorActions
              onSave={handleSave}
              onSubmitReview={handleSubmitReviewClick}
              onFinalize={handleFinalizeClick}
              isSaving={isSaving}
              isFinalizing={isFinalizing}
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
          )}
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
          message="This will mark your post as complete and ready for publication. Once completed, you won't be able to make further edits or receive additional suggestions. Are you sure you want to finalize this draft?"
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

        {/* Review Progress Notification */}
        <ReviewProgressNotification
          isVisible={isReviewInProgress && !isDismissed}
          onDismiss={dismissProgress}
        />

      </EditorErrorBoundary>
    </div>
  );
});

// Rename the component to EditorPage and export it
export const EditorPage = EditorPageContent;

EditorPage.displayName = 'EditorPage';
