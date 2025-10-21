import { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Suggestion } from '../types';
import { calculateContentDiff, mergeContentDiffs, hasSignificantChanges } from '../utils/contentDiff';

import { modeTransitionManager, type TransitionProgress } from '../services/ModeTransitionManager';
import { useAccessibilityAnnouncements } from '../hooks/useAccessibilityAnnouncements';
import { useFocusManagement } from '../hooks/useFocusManagement';
import { useModeTransitionErrorHandling } from '../hooks/useEditorErrorHandling';
import { useDebounce } from '../hooks/useDebounce';
// performanceMonitor removed to resolve build issues

// Editor mode types
export type EditorMode = 'edit' | 'review';

// Content diff interface for tracking changes
export interface ContentDiff {
  type: 'insert' | 'delete' | 'replace';
  startOffset: number;
  endOffset: number;
  oldText: string;
  newText: string;
  timestamp: number;
}

// Editor mode context interface
export interface EditorModeContextType {
  // Current state
  currentMode: EditorMode;
  isTransitioning: boolean;
  pendingRecalculation: boolean;

  // Mode switching
  switchToEditMode: () => Promise<void>;
  switchToReviewMode: () => Promise<void>;

  // Content tracking
  trackContentChange: (oldContent: string, newContent: string) => void;
  markContentChanged: () => void;
  getContentChangesSinceLastReview: () => ContentDiff[];
  hasContentChanges: () => boolean;
  getContentAtLastReview: () => string;
  setContentAtLastReview: (content: string) => void;

  // Suggestion management
  recalculateSuggestions: () => Promise<void>;
  getSuggestionVersion: () => number;

  // Transition management
  getTransitionProgress: () => TransitionProgress | null;
  retryFailedTransition: () => Promise<void>;
  cancelTransition: () => boolean;
  onTransitionProgress: (callback: (progress: TransitionProgress) => void) => () => void;

  // Error handling
  lastTransitionError: string | null;
  clearTransitionError: () => void;
}

// Context creation
const EditorModeContext = createContext<EditorModeContextType | undefined>(undefined);

// Provider props interface
export interface EditorModeProviderProps {
  children: ReactNode;
  onSuggestionRecalculation?: (content: string, currentSuggestions: Suggestion[]) => Promise<Suggestion[]>;
  currentSuggestions?: Suggestion[];
  postId?: string;
}

// Provider component
export const EditorModeProvider = ({
  children,
  onSuggestionRecalculation,
  currentSuggestions = [],
  postId
}: EditorModeProviderProps) => {
  // Accessibility hooks
  const { announceModeChange, announceTransitionState, announceSuggestionUpdate } = useAccessibilityAnnouncements();
  const { handleModeTransitionFocus } = useFocusManagement();

  // Error handling hook
  const {
    handleModeTransitionError,
    handleSuggestionRecalculationError,
    handleSuggestionApiError,
    handleModeTransitionSuccess,
  } = useModeTransitionErrorHandling();

  // Core mode state - default to review mode if suggestions exist
  const [currentMode, setCurrentMode] = useState<EditorMode>(() => {
    // Default to review mode if suggestions are provided
    return currentSuggestions && currentSuggestions.length > 0 ? 'review' : 'edit';
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingRecalculation, setPendingRecalculation] = useState(false);

  // Content tracking state
  const [contentAtLastReview, setContentAtLastReview] = useState<string>('');
  const [suggestionVersion, setSuggestionVersion] = useState<number>(1);

  // Transition management state
  const [currentTransitionProgress, setCurrentTransitionProgress] = useState<TransitionProgress | null>(null);
  const [lastTransitionError, setLastTransitionError] = useState<string | null>(null);
  const [lastFailedTransition, setLastFailedTransition] = useState<{
    fromMode: EditorMode;
    toMode: EditorMode;
    context: any;
  } | null>(null);

  // Content changes tracking
  const contentChangesRef = useRef<ContentDiff[]>([]);
  const currentContentRef = useRef<string>('');

  // Debounced mode switching to prevent excessive API calls
  const debouncedSwitchToReviewMode = useDebounce(async () => {
    return await performSwitchToReviewMode();
  }, 300); // 300ms debounce

  const debouncedSwitchToEditMode = useDebounce(async () => {
    return await performSwitchToEditMode();
  }, 150); // Shorter debounce for edit mode (less expensive)

  // Switch to Edit mode
  const switchToEditMode = useCallback(async () => {
    if (currentMode === 'edit') return;
    return await debouncedSwitchToEditMode();
  }, [currentMode, debouncedSwitchToEditMode]);

  // Internal edit mode switch implementation
  const performSwitchToEditMode = useCallback(async () => {

    try {
      setIsTransitioning(true);
      setLastTransitionError(null);

      // Announce transition start
      announceTransitionState('starting', 'edit');

      // Handle focus management
      handleModeTransitionFocus(currentMode, 'edit', true);

      const result = await modeTransitionManager.beginTransition(
        currentMode,
        'edit',
        {
          content: currentContentRef.current,
          contentAtLastReview,
          currentSuggestions,
          postId,
          onSuggestionRecalculation
        }
      );

      if (result.success) {
        setCurrentMode('edit');

        // Announce successful mode change
        announceModeChange('edit');
        announceTransitionState('completed', 'edit');

        // Show success feedback
        handleModeTransitionSuccess(currentMode, 'edit');
      } else {
        const errorMessage = result.error || 'Failed to switch to Edit mode';
        setLastTransitionError(errorMessage);
        announceTransitionState('failed');

        // Handle error with comprehensive feedback
        await handleModeTransitionError(
          new Error(errorMessage),
          currentMode,
          'edit',
          {
            content: currentContentRef.current,
            contentAtLastReview,
            retryable: result.retryable,
            requiresUserAction: result.requiresUserAction
          }
        );

        if (result.retryable) {
          setLastFailedTransition({
            fromMode: currentMode,
            toMode: 'edit',
            context: {
              content: currentContentRef.current,
              contentAtLastReview,
              currentSuggestions,
              postId,
              onSuggestionRecalculation
            }
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastTransitionError(errorMessage);
      announceTransitionState('failed');

      // Handle error with comprehensive feedback
      await handleModeTransitionError(
        error instanceof Error ? error : new Error(String(error)),
        currentMode,
        'edit',
        {
          content: currentContentRef.current,
          contentAtLastReview,
          technicalError: error instanceof Error ? error.stack : undefined
        }
      );
    } finally {
      setIsTransitioning(false);
      // Handle focus management for completed transition
      if (!lastTransitionError) {
        handleModeTransitionFocus(currentMode, 'edit', false);
      }
    }
  }, [contentAtLastReview, currentSuggestions, postId, onSuggestionRecalculation, announceTransitionState, announceModeChange, handleModeTransitionFocus, handleModeTransitionError, handleModeTransitionSuccess]);

  // Check if there are any content changes
  const hasContentChanges = useCallback((): boolean => {
    const mergedChanges = mergeContentDiffs(contentChangesRef.current);
    return mergedChanges.length > 0 && hasSignificantChanges(mergedChanges);
  }, []);

  // Switch to Review mode with suggestion recalculation
  const switchToReviewMode = useCallback(async () => {
    if (currentMode === 'review') return;
    return await debouncedSwitchToReviewMode();
  }, [currentMode, debouncedSwitchToReviewMode]);

  // Internal review mode switch implementation
  const performSwitchToReviewMode = useCallback(async () => {

    const hasChanges = hasContentChanges();

    try {
      setIsTransitioning(true);
      setLastTransitionError(null);

      // Announce transition start
      announceTransitionState('starting', 'review');

      // Handle focus management
      handleModeTransitionFocus(currentMode, 'review', true);

      if (hasChanges) {
        announceTransitionState('recalculating');
      }

      const result = await modeTransitionManager.beginTransition(
        currentMode,
        'review',
        {
          content: currentContentRef.current,
          contentAtLastReview,
          currentSuggestions,
          postId,
          onSuggestionRecalculation
        }
      );

      if (result.success) {
        setCurrentMode('review');

        // Clear content changes and update version when successfully switching to review
        contentChangesRef.current = [];
        setSuggestionVersion(prev => prev + 1);

        // Update content baseline
        if (currentContentRef.current) {
          setContentAtLastReview(currentContentRef.current);
        }

        // Announce successful mode change and suggestion updates
        announceModeChange('review', hasChanges);
        announceTransitionState('completed', 'review');

        if (result.updatedSuggestions) {
          announceSuggestionUpdate(result.updatedSuggestions.length);
        }

        // Show success feedback
        handleModeTransitionSuccess(
          currentMode,
          'review',
          !!result.updatedSuggestions
        );
      } else {
        const errorMessage = result.error || 'Failed to switch to Review mode';
        setLastTransitionError(errorMessage);
        announceTransitionState('failed');

        // Determine error type based on the failure reason
        if (errorMessage.toLowerCase().includes('suggestion')) {
          await handleSuggestionRecalculationError(
            new Error(errorMessage),
            {
              content: currentContentRef.current,
              contentAtLastReview,
              hasChanges,
              retryable: result.retryable
            }
          );
        } else {
          await handleModeTransitionError(
            new Error(errorMessage),
            currentMode,
            'review',
            {
              content: currentContentRef.current,
              contentAtLastReview,
              hasChanges,
              retryable: result.retryable,
              requiresUserAction: result.requiresUserAction
            }
          );
        }

        if (result.retryable) {
          setLastFailedTransition({
            fromMode: currentMode,
            toMode: 'review',
            context: {
              content: currentContentRef.current,
              contentAtLastReview,
              currentSuggestions,
              postId,
              onSuggestionRecalculation
            }
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setLastTransitionError(errorMessage);
      announceTransitionState('failed');

      // Handle different types of errors appropriately
      if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch')) {
        await handleSuggestionApiError(
          error instanceof Error ? error : new Error(String(error)),
          {
            content: currentContentRef.current,
            contentAtLastReview,
            hasChanges,
            technicalError: error instanceof Error ? error.stack : undefined
          }
        );
      } else if (errorMessage.toLowerCase().includes('suggestion')) {
        await handleSuggestionRecalculationError(
          error instanceof Error ? error : new Error(String(error)),
          {
            content: currentContentRef.current,
            contentAtLastReview,
            hasChanges,
            technicalError: error instanceof Error ? error.stack : undefined
          }
        );
      } else {
        await handleModeTransitionError(
          error instanceof Error ? error : new Error(String(error)),
          currentMode,
          'review',
          {
            content: currentContentRef.current,
            contentAtLastReview,
            hasChanges,
            technicalError: error instanceof Error ? error.stack : undefined
          }
        );
      }
    } finally {
      setIsTransitioning(false);
      setPendingRecalculation(false);

      // Handle focus management for completed transition
      if (!lastTransitionError) {
        handleModeTransitionFocus(currentMode, 'review', false);
      }
    }
  }, [contentAtLastReview, currentSuggestions, postId, onSuggestionRecalculation, hasContentChanges, announceTransitionState, announceModeChange, announceSuggestionUpdate, handleModeTransitionFocus, handleModeTransitionError, handleSuggestionRecalculationError, handleSuggestionApiError, handleModeTransitionSuccess]);



  // Mark content as changed (legacy method for backward compatibility)
  const markContentChanged = useCallback(() => {
    // Add a generic content change marker
    const change: ContentDiff = {
      type: 'replace',
      startOffset: 0,
      endOffset: 0,
      oldText: '',
      newText: '',
      timestamp: Date.now()
    };

    contentChangesRef.current.push(change);
  }, []);

  // Get content changes since last review
  const getContentChangesSinceLastReview = useCallback((): ContentDiff[] => {
    return mergeContentDiffs(contentChangesRef.current);
  }, []);



  // Get content at last review
  const getContentAtLastReview = useCallback((): string => {
    return contentAtLastReview;
  }, [contentAtLastReview]);

  // Set content at last review (called when switching to Review mode)
  const setContentAtLastReviewCallback = useCallback((content: string) => {
    setContentAtLastReview(content);
    // Clear content changes when we establish a new baseline
    contentChangesRef.current = [];
  }, []);

  // Recalculate suggestions manually
  const recalculateSuggestions = useCallback(async () => {
    if (!onSuggestionRecalculation) return;

    try {
      setPendingRecalculation(true);

      await onSuggestionRecalculation(contentAtLastReview, currentSuggestions);

      setSuggestionVersion(prev => prev + 1);
    } catch (error) {
      console.error('Failed to recalculate suggestions:', error);
      throw error;
    } finally {
      setPendingRecalculation(false);
    }
  }, [contentAtLastReview, onSuggestionRecalculation, currentSuggestions, hasContentChanges]);

  // Get current suggestion version
  const getSuggestionVersion = useCallback(() => {
    return suggestionVersion;
  }, [suggestionVersion]);

  // Get current transition progress
  const getTransitionProgress = useCallback(() => {
    return currentTransitionProgress;
  }, [currentTransitionProgress]);

  // Retry a failed transition
  const retryFailedTransition = useCallback(async () => {
    if (!lastFailedTransition) {
      throw new Error('No failed transition to retry');
    }

    try {
      setIsTransitioning(true);
      setLastTransitionError(null);

      const result = await modeTransitionManager.retryTransition(
        lastFailedTransition.fromMode,
        lastFailedTransition.toMode,
        lastFailedTransition.context
      );

      if (result.success) {
        setCurrentMode(lastFailedTransition.toMode);
        setLastFailedTransition(null);

        if (lastFailedTransition.toMode === 'review') {
          contentChangesRef.current = [];
          setSuggestionVersion(prev => prev + 1);
          if (currentContentRef.current) {
            setContentAtLastReview(currentContentRef.current);
          }
        }
      } else {
        setLastTransitionError(result.error || 'Retry failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Retry failed';
      setLastTransitionError(errorMessage);
      console.error('Failed to retry transition:', error);
    } finally {
      setIsTransitioning(false);
    }
  }, [lastFailedTransition]);

  // Cancel current transition
  const cancelTransition = useCallback(() => {
    const cancelled = modeTransitionManager.cancelTransition();
    if (cancelled) {
      setIsTransitioning(false);
      setCurrentTransitionProgress(null);
    }
    return cancelled;
  }, []);

  // Subscribe to transition progress
  const onTransitionProgress = useCallback((callback: (progress: TransitionProgress) => void) => {
    return modeTransitionManager.onProgress(callback);
  }, []);

  // Clear transition error
  const clearTransitionError = useCallback(() => {
    setLastTransitionError(null);
    setLastFailedTransition(null);
  }, []);

  // Set up progress tracking
  useEffect(() => {
    const unsubscribe = modeTransitionManager.onProgress((progress) => {
      setCurrentTransitionProgress(progress);

      // Update pending recalculation state based on progress
      if (progress.phase === 'recalculating') {
        setPendingRecalculation(true);
      } else if (progress.phase === 'completing' || progress.phase === 'error') {
        setPendingRecalculation(false);
      }
    });

    return unsubscribe;
  }, []);

  // Switch to review mode when suggestions are loaded (if not already in review mode)
  useEffect(() => {
    if (currentSuggestions && currentSuggestions.length > 0 && currentMode === 'edit' && !isTransitioning) {
      // Automatically switch to review mode when suggestions are available
      setCurrentMode('review');
    }
  }, [currentSuggestions, currentMode, isTransitioning]);

  // Update current content ref when content changes are tracked
  const trackContentChangeWithRef = useCallback((oldContent: string, newContent: string) => {
    currentContentRef.current = newContent;

    if (oldContent === newContent) return;

    // Calculate content diffs directly
    const diffs = calculateContentDiff(oldContent, newContent);

    // Add new diffs to the tracking array
    contentChangesRef.current.push(...diffs);

    // Merge overlapping diffs to keep the array manageable
    if (contentChangesRef.current.length > 10) {
      contentChangesRef.current = mergeContentDiffs(contentChangesRef.current);
    }
  }, []);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue: EditorModeContextType = useMemo(() => ({
    // Current state
    currentMode,
    isTransitioning,
    pendingRecalculation,

    // Mode switching
    switchToEditMode,
    switchToReviewMode,

    // Content tracking
    trackContentChange: trackContentChangeWithRef,
    markContentChanged,
    getContentChangesSinceLastReview,
    hasContentChanges,
    getContentAtLastReview,
    setContentAtLastReview: setContentAtLastReviewCallback,

    // Suggestion management
    recalculateSuggestions,
    getSuggestionVersion,

    // Transition management
    getTransitionProgress,
    retryFailedTransition,
    cancelTransition,
    onTransitionProgress,

    // Error handling
    lastTransitionError,
    clearTransitionError,
  }), [
    currentMode,
    isTransitioning,
    pendingRecalculation,
    switchToEditMode,
    switchToReviewMode,
    trackContentChangeWithRef,
    markContentChanged,
    getContentChangesSinceLastReview,
    hasContentChanges,
    getContentAtLastReview,
    setContentAtLastReviewCallback,
    recalculateSuggestions,
    getSuggestionVersion,
    getTransitionProgress,
    retryFailedTransition,
    cancelTransition,
    onTransitionProgress,
    lastTransitionError,
    clearTransitionError
  ]);

  return (
    <EditorModeContext.Provider value={contextValue}>
      {children}
    </EditorModeContext.Provider>
  );
};

// Hook to use the editor mode context
export const useEditorMode = (): EditorModeContextType => {
  const context = useContext(EditorModeContext);
  if (context === undefined) {
    throw new Error('useEditorMode must be used within an EditorModeProvider');
  }
  return context;
};

// Export context for testing purposes
export { EditorModeContext };
