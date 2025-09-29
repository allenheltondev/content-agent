import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { BlogPost } from '../types';
import { apiService } from '../services/ApiService';
import { useToast } from '../hooks/useToast';
import { useAutoSave } from '../hooks/useAutoSave';
import { useDraftPersistence } from '../hooks/useDraftPersistence';
import { useSuggestionManager } from '../hooks/useSuggestionManager';
import { EditorHeader } from '../components/editor/EditorHeader';
import { ContentEditor } from '../components/editor/ContentEditor';
import { SuggestionList } from '../components/editor/SuggestionList';
import { EditorActions } from '../components/editor/EditorActions';
import { SuggestionStats } from '../components/editor/SuggestionStats';
import { UndoNotification } from '../components/editor/UndoNotification';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ConfirmationModal } from '../components/common/ConfirmationModal';
import { DraftRecoveryNotification } from '../components/editor/DraftRecoveryNotification';
import { ConflictResolutionModal } from '../components/editor/ConflictResolutionModal';
import {
  detectConflict,
  createConflictData,
  applyResolution,
  type ConflictData,
  type ConflictResolution
} from '../utils/conflictResolution';

export const EditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);
  const [, setInitialLoadTimestamp] = useState<number>(0);
  const [showUndoNotification, setShowUndoNotification] = useState(false);

  // Workflow confirmation modals
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showFinalizeConfirmation, setShowFinalizeConfirmation] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Auto-save hook
  const {
    isSaving: isAutoSaving,
    lastSaved,
    saveError,
    forceSave,
    clearError: clearSaveError
  } = useAutoSave({
    postId: id || '',
    title,
    content,
    onSaveSuccess: (savedPost) => {
      setPost(savedPost);
      setIsDirty(false);
      clearDraft(); // Clear draft after successful save
    },
    onSaveError: (error) => {
      showError(`Auto-save failed: ${error}`);
    },
    enabled: !!id && !!post
  });

  // Draft persistence hook
  const { loadDraft, clearDraft } = useDraftPersistence({
    postId: id || '',
    title,
    content,
    enabled: !!id
  });

  // Suggestion management hook
  const {
    suggestions,
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
  } = useSuggestionManager(content, setContent, {
    postId: id || '',
    maxUndoHistory: 10,
    persistState: true,
    autoSaveOnAccept: true
  });

  // Combined saving state
  const isSaving = isAutoSaving;

  // Load post data on mount
  useEffect(() => {
    const loadPost = async () => {
      if (!id) {
        showError('No post ID provided');
        navigate('/dashboard');
        return;
      }

      try {
        setIsLoading(true);
        const loadedPost = await apiService.getPost(id);
        setPost(loadedPost);
        setInitialLoadTimestamp(Date.now());

        // Check for local draft
        const draft = loadDraft();

        if (draft) {
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
            setShowDraftRecovery(true);
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
  }, [id, navigate, showError, loadDraft, loadSuggestions]);

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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, isSaving, handleSave]);

  // Clear save errors when user starts typing
  useEffect(() => {
    if (saveError && (isDirty || content || title)) {
      clearSaveError();
    }
  }, [saveError, isDirty, content, title, clearSaveError]);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsDirty(true);
  };

  // Handle title changes
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    setIsDirty(true);
  };

  // Handle draft recovery
  const handleRecoverDraft = useCallback((draftData: { title: string; content: string; timestamp: number }) => {
    setTitle(draftData.title);
    setContent(draftData.content);
    setIsDirty(true);
    setShowDraftRecovery(false);
    showSuccess('Draft recovered successfully');
  }, [showSuccess]);

  // Handle draft discard
  const handleDiscardDraft = useCallback(() => {
    clearDraft();
    setShowDraftRecovery(false);
    showSuccess('Draft discarded');
  }, [clearDraft, showSuccess]);

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

  // Clear suggestions error when user dismisses
  useEffect(() => {
    if (suggestionsError) {
      const timer = setTimeout(() => {
        clearSuggestionsError();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [suggestionsError, clearSuggestionsError]);

  // Workflow validation
  const validateWorkflowAction = (): { isValid: boolean; error?: string } => {
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

      await apiService.submitForReview(post.id);
      clearDraft(); // Clear draft after successful submission
      showSuccess('Post submitted for review successfully. You will receive additional AI suggestions.');
      setShowSubmitConfirmation(false);
      navigate('/dashboard');
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
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <EditorHeader
          title={title}
          onTitleChange={handleTitleChange}
          isSaving={isSaving}
          isDirty={isDirty}
          lastSaved={lastSaved}
          onSave={handleSave}
        />

        {/* Notifications */}
        <div className="px-4 sm:px-6 lg:px-8">
          {/* Draft Recovery Notification */}
          {showDraftRecovery && (
            <div className="pt-4">
              <DraftRecoveryNotification
                draftData={loadDraft()!}
                onRecover={handleRecoverDraft}
                onDiscard={handleDiscardDraft}
                onDismiss={() => setShowDraftRecovery(false)}
              />
            </div>
          )}

          {/* Save Error Notification */}
          {saveError && (
            <div className="pt-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-sm text-red-700">
                    <strong>Save Error:</strong> {saveError}
                  </div>
                  <button
                    onClick={clearSaveError}
                    className="ml-auto text-red-400 hover:text-red-600"
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
            <div className="pt-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="text-sm text-yellow-700">
                    <strong>Suggestions Error:</strong> {suggestionsError}
                  </div>
                  <button
                    onClick={clearSuggestionsError}
                    className="ml-auto text-yellow-400 hover:text-yellow-600"
                  >
                    <span className="sr-only">Dismiss</span>
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Main editor area */}
            <div className="flex-1 min-w-0">
              <div className="bg-white shadow-sm rounded-lg overflow-hidden">
                <ContentEditor
                  content={content}
                  onChange={handleContentChange}
                  placeholder="Start writing your blog post..."
                />
              </div>

              {/* Suggestion list below editor on mobile, hidden on desktop */}
              {hasActiveSuggestions && (
                <div className="mt-4 bg-white shadow-sm rounded-lg p-4 sm:p-6 lg:hidden">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    AI Suggestions ({suggestions.length})
                  </h3>
                  <SuggestionList
                    suggestions={suggestions}
                    content={content}
                    onAccept={handleAcceptSuggestion}
                    onReject={handleRejectSuggestion}
                  />
                </div>
              )}
            </div>

            {/* Sidebar with suggestion stats - hidden on mobile, shown on desktop */}
            {(hasActiveSuggestions || stats.accepted > 0 || stats.rejected > 0) && (
              <div className="hidden lg:block w-80 xl:w-96 space-y-4 flex-shrink-0">
                <SuggestionStats
                  stats={stats}
                  onUndoClick={canUndo ? handleUndo : undefined}
                />

                {suggestionsLoading && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-gray-600">Loading suggestions...</span>
                    </div>
                  </div>
                )}

                {/* Desktop suggestion list */}
                {hasActiveSuggestions && (
                  <div className="bg-white shadow-sm rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      AI Suggestions ({suggestions.length})
                    </h3>
                    <SuggestionList
                      suggestions={suggestions}
                      content={content}
                      onAccept={handleAcceptSuggestion}
                      onReject={handleRejectSuggestion}
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
    </div>
  );
};
