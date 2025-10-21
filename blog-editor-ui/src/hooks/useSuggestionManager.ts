import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Suggestion } from '../types';
import { suggestionService } from '../services/SuggestionService';
import { apiService } from '../services/ApiService';
import { useOptimisticSuggestionResolution } from './useOptimisticSuggestionResolution';
import { useOptimizedSuggestionState } from './useOptimizedSuggestionState';
import { autoCorrectSuggestionPositions } from '../utils/suggestionValidation';

/**
 * Undo action for suggestion acceptance
 */
export interface SuggestionUndoAction {
  id: string;
  suggestionId: string;
  originalContent: string;
  newContent: string;
  suggestion: Suggestion;
  timestamp: number;
}

/**
 * Suggestion manager state
 */
export interface SuggestionManagerState {
  allSuggestions: Suggestion[]; // Store all suggestions from API
  acceptedSuggestions: string[];
  rejectedSuggestions: string[];
  undoHistory: SuggestionUndoAction[];
  summary?: string; // Content summary from API
  isLoading: boolean;
  error: string | null;
  currentPostId: string | null; // Track which post we're loading
}

/**
 * Request manager for tracking current request state
 */
interface RequestManager {
  currentController: AbortController | null;
  currentPostId: string | null;
  isRequestInProgress: boolean;
}

/**
 * Configuration for suggestion manager
 */
export interface SuggestionManagerConfig {
  postId: string;
  maxUndoHistory: number;
  persistState: boolean;
  autoSaveOnAccept: boolean;
  onSuccess?: (action: string, suggestionId: string) => void;
  onError?: (error: string, action: string, suggestionId: string) => void;
}

/**
 * Retry configuration for suggestion actions
 */
// Legacy retry config interface removed (handled elsewhere)

/**
 * Default retry configuration for suggestion actions
 */
// Note: retry config handled in optimistic resolution system

// Note: retryApiCall is now handled by the optimistic resolution system

/**
 * Remove duplicate suggestions that have the same text to replace and same replacement
 */
function removeDuplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
  const seen = new Map<string, Suggestion>();
  const duplicates: string[] = [];

  for (const suggestion of suggestions) {
    // Create a key based on the text being replaced and the replacement text
    // Also include position to handle cases where same text appears multiple times
    const key = `${suggestion.textToReplace.trim()}|${suggestion.replaceWith.trim()}|${suggestion.startOffset}-${suggestion.endOffset}`;

    if (seen.has(key)) {
      // This is a duplicate - keep the first one (usually has better positioning)
      duplicates.push(suggestion.id);
      console.log(`Duplicate suggestion detected: "${suggestion.textToReplace}" -> "${suggestion.replaceWith}" at position ${suggestion.startOffset}-${suggestion.endOffset}`);
    } else {
      seen.set(key, suggestion);
    }
  }

  // If we still have too many duplicates, try a more lenient approach
  if (duplicates.length > 0) {
    // Group by text replacement only (ignoring position) and keep the best one from each group
    const textOnlyGroups = new Map<string, Suggestion[]>();

    for (const suggestion of suggestions.filter(s => !duplicates.includes(s.id))) {
      const textKey = `${suggestion.textToReplace.trim()}|${suggestion.replaceWith.trim()}`;
      if (!textOnlyGroups.has(textKey)) {
        textOnlyGroups.set(textKey, []);
      }
      textOnlyGroups.get(textKey)!.push(suggestion);
    }

    // For each group with multiple suggestions, keep only the one with highest priority
    const additionalDuplicates: string[] = [];
    for (const [, groupSuggestions] of textOnlyGroups) {
      if (groupSuggestions.length > 1) {
        // Sort by priority (high > medium > low) and keep the first one
        const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
        const sorted = groupSuggestions.sort((a, b) =>
          (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
        );

        // Mark all but the first as duplicates
        for (let i = 1; i < sorted.length; i++) {
          additionalDuplicates.push(sorted[i].id);
          console.log(`Additional duplicate detected (lower priority): "${sorted[i].textToReplace}" -> "${sorted[i].replaceWith}"`);
        }
      }
    }

    duplicates.push(...additionalDuplicates);
  }

  // Return only unique suggestions
  return suggestions.filter(s => !duplicates.includes(s.id));
}

/**
 * Get user-friendly error message for suggestion actions
 */
function getUserFriendlyErrorMessage(error: any, action: string): string {
  if (!error) return `Failed to ${action} suggestion`;

  const errorMessage = error.message || error.toString();

  // Network errors
  if (errorMessage.includes('Network request failed') || errorMessage.includes('NETWORK_ERROR')) {
    return `Network error while trying to ${action} suggestion. Please check your connection and try again.`;
  }

  // Authentication errors
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
    return `Authentication error. Please refresh the page and try again.`;
  }

  // Post ID errors
  if (errorMessage.includes('Post ID is required')) {
    return `Unable to ${action} suggestion. Please save your post first and try again.`;
  }

  // Suggestion not found errors
  if (errorMessage.includes('Suggestion not found') || errorMessage.includes('404')) {
    return `This suggestion is no longer available. It may have been already processed.`;
  }

  // Server errors
  if (errorMessage.includes('500') || errorMessage.includes('Something went wrong')) {
    return `Server error while trying to ${action} suggestion. Please try again in a moment.`;
  }

  // Default fallback
  return `Failed to ${action} suggestion. ${errorMessage}`;
}

/**
 * Hook for managing suggestion acceptance, rejection, and undo functionality
 */
export function useSuggestionManager(
  content: string,
  onContentChange: (content: string) => void,
  config: SuggestionManagerConfig
) {
  // Enhanced state management with optimization
  const optimizedState = useOptimizedSuggestionState([], {
    enableMemoization: true,
    batchStateUpdates: true,
    batchDelay: 50
  });

  // Optimistic resolution system
  const optimisticResolution = useOptimisticSuggestionResolution({
    enableBatching: true,
    batchDelay: 300,
    maxBatchSize: 10
  });

  const [state, setState] = useState<SuggestionManagerState>({
    allSuggestions: [], // Store all suggestions from API
    acceptedSuggestions: [],
    rejectedSuggestions: [],
    undoHistory: [],
    summary: undefined, // Content summary from API
    isLoading: false,
    error: null,
    currentPostId: null // Track which post we're loading
  });

  // Request manager ref to track current request state without causing re-renders
  const requestManagerRef = useRef<RequestManager>({
    currentController: null,
    currentPostId: null,
    isRequestInProgress: false
  });
  const persistenceKey = `suggestion_state_${config.postId}`;

  /**
   * Load persisted suggestion state from localStorage
   */
  const loadPersistedState = useCallback(() => {
    try {
      const persistedData = localStorage.getItem(persistenceKey);
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        setState(prev => ({
          ...prev,
          acceptedSuggestions: parsed.acceptedSuggestions || [],
          rejectedSuggestions: parsed.rejectedSuggestions || [],
          undoHistory: parsed.undoHistory || []
        }));
      }
    } catch (error) {
      console.warn('Failed to load persisted suggestion state:', error);
    }
  }, [persistenceKey]);

  /**
   * Persist suggestion state to localStorage
   */
  const persistState = useCallback(() => {
    try {
      const dataToStore = {
        acceptedSuggestions: state.acceptedSuggestions,
        rejectedSuggestions: state.rejectedSuggestions,
        undoHistory: state.undoHistory,
        timestamp: Date.now()
      };
      localStorage.setItem(persistenceKey, JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to persist suggestion state:', error);
    }
  }, [persistenceKey, state.acceptedSuggestions, state.rejectedSuggestions, state.undoHistory]);

  // Load persisted state on mount and update currentPostId
  useEffect(() => {
    if (config.persistState) {
      loadPersistedState();
    }

    // Update currentPostId and clear summary when config.postId changes
    setState(prev => ({
      ...prev,
      currentPostId: config.postId,
      summary: undefined // Clear summary when switching posts
    }));
  }, [config.postId, config.persistState, loadPersistedState]);

  // Persist state changes
  useEffect(() => {
    if (config.persistState && config.postId) {
      persistState();
    }
  }, [state.acceptedSuggestions, state.rejectedSuggestions, state.undoHistory, config.persistState, config.postId, persistState]);

  /**
   * Load suggestions from API
   */
  const loadSuggestions = useCallback(async () => {
    if (!config.postId) {
      console.warn('Cannot load suggestions: Post ID is required');
      return;
    }

    // Don't start new request if same post is already loading
    if (requestManagerRef.current.isRequestInProgress &&
      requestManagerRef.current.currentPostId === config.postId) {
      return;
    }

    // Only abort if loading different post
    if (requestManagerRef.current.currentController &&
      requestManagerRef.current.currentPostId !== config.postId) {
      requestManagerRef.current.currentController.abort();
      // Clear the reference to prevent memory leaks
      requestManagerRef.current.currentController = null;
    }

    // Create new controller and update request manager
    const controller = new AbortController();
    requestManagerRef.current = {
      currentController: controller,
      currentPostId: config.postId,
      isRequestInProgress: true
    };

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiService.getSuggestions(
        config.postId,
        controller.signal
      );

      // First, auto-correct suggestion positions if they don't match the current content
      const { corrected: validatedSuggestions, uncorrectable } = autoCorrectSuggestionPositions(response.suggestions, content);

      if (uncorrectable.length > 0) {
        console.warn(`${uncorrectable.length} suggestions could not be auto-corrected and will be filtered out`);
      }

      // Then filter out duplicate suggestions after position correction
      const uniqueSuggestions = removeDuplicateSuggestions(validatedSuggestions);
      const duplicateCount = validatedSuggestions.length - uniqueSuggestions.length;

      if (duplicateCount > 0) {
        console.log(`Automatically rejected ${duplicateCount} duplicate suggestions`);
      }

      // Store all suggestions and summary from API response
      setState(prev => ({
        ...prev,
        allSuggestions: uniqueSuggestions,
        summary: response.summary,
        isLoading: false
      }));

      // Update optimized state with new suggestions
      optimizedState.updateSuggestions(uniqueSuggestions);

      // Debug logging
      console.log(`Loaded suggestions for post ${config.postId}:`, {
        total: response.suggestions.length,
        afterAutoCorrection: validatedSuggestions.length,
        afterDeduplication: uniqueSuggestions.length,
        uncorrectable: uncorrectable.length,
        duplicatesRemoved: duplicateCount
      });

      // Mark request as complete and clean up controller reference
      requestManagerRef.current.isRequestInProgress = false;
      requestManagerRef.current.currentController = null;
    } catch (error: any) {
      // Mark request as complete and clean up controller reference
      requestManagerRef.current.isRequestInProgress = false;
      requestManagerRef.current.currentController = null;

      if (error.name !== 'AbortError') {
        console.error('Failed to load suggestions:', error);
        const userMessage = getUserFriendlyErrorMessage(error, 'load');
        setState(prev => ({
          ...prev,
          error: userMessage,
          isLoading: false
        }));
      } else {
        // Silent handling of abort errors
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [config.postId, content]); // Depend on postId and content for validation

  /**
   * Accept a suggestion and apply it to content
   */
  const acceptSuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = state.allSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      console.warn('Suggestion not found:', suggestionId);
      const errorMessage = 'This suggestion is no longer available. It may have been already processed.';
      setState(prev => ({ ...prev, error: errorMessage }));
      return;
    }

    if (!config.postId) {
      console.error('Post ID is required for suggestion actions');
      const errorMessage = 'Unable to accept suggestion. Please save your post first and try again.';
      setState(prev => ({ ...prev, error: errorMessage }));
      return;
    }

    try {
      // Apply suggestion to content
      const newContent = suggestionService.applySuggestion(content, suggestion);

      // Recalculate remaining suggestion offsets after the replacement
      const { startOffset, endOffset, replaceWith } = suggestion;
      const delta = replaceWith.length - (endOffset - startOffset);

      const updatedAllSuggestions: Suggestion[] = state.allSuggestions
        .map((s) => {
          if (s.id === suggestionId) {
            return s; // keep accepted suggestion as-is (filtered by accepted set)
          }

          // Drop suggestions that overlap the replaced range
          const overlaps = !(s.endOffset <= startOffset || s.startOffset >= endOffset);
          if (overlaps) {
            return null as any;
          }

          // Shift suggestions that start after the replaced range
          if (s.startOffset >= endOffset) {
            return {
              ...s,
              startOffset: s.startOffset + delta,
              endOffset: s.endOffset + delta
            };
          }

          return s;
        })
        .filter((s): s is Suggestion => Boolean(s));

      // Create undo action
      const undoAction: SuggestionUndoAction = {
        id: `undo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        suggestionId,
        originalContent: content,
        newContent,
        suggestion,
        timestamp: Date.now()
      };

      // Update state optimistically
      setState(prev => {
        const newUndoHistory = [undoAction, ...prev.undoHistory].slice(0, config.maxUndoHistory);

        return {
          ...prev,
          acceptedSuggestions: [...prev.acceptedSuggestions, suggestionId],
          allSuggestions: updatedAllSuggestions,
          undoHistory: newUndoHistory,
          error: null // Clear any previous errors
        };
      });

      // Update optimized state
      optimizedState.updateSuggestions(updatedAllSuggestions);
      optimizedState.markAccepted(suggestionId);

      // Update content
      onContentChange(newContent);

      // Use optimistic resolution for backend update
      optimisticResolution.resolveSuggestion(config.postId, suggestionId, 'accepted');

      // Call success callback
      config.onSuccess?.('accept', suggestionId);

    } catch (error: any) {
      console.error('Failed to accept suggestion:', error);
      const userMessage = getUserFriendlyErrorMessage(error, 'accept');
      setState(prev => ({ ...prev, error: userMessage }));
    }
  }, [state.allSuggestions, content, onContentChange, config.maxUndoHistory, config.postId, optimizedState, optimisticResolution]);

  /**
   * Reject a suggestion and remove it from UI
   */
  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = state.allSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      console.warn('Suggestion not found:', suggestionId);
      const errorMessage = 'This suggestion is no longer available. It may have been already processed.';
      setState(prev => ({ ...prev, error: errorMessage }));
      return;
    }

    if (!config.postId) {
      console.error('Post ID is required for suggestion actions');
      const errorMessage = 'Unable to reject suggestion. Please save your post first and try again.';
      setState(prev => ({ ...prev, error: errorMessage }));
      return;
    }

    try {
      // Update state optimistically
      setState(prev => ({
        ...prev,
        rejectedSuggestions: [...prev.rejectedSuggestions, suggestionId],
        error: null // Clear any previous errors
      }));

      // Update optimized state
      optimizedState.markRejected(suggestionId);

      // Use optimistic resolution for backend update
      optimisticResolution.resolveSuggestion(config.postId, suggestionId, 'rejected');

      // Call success callback
      config.onSuccess?.('reject', suggestionId);

    } catch (error: any) {
      console.error('Failed to reject suggestion:', error);
      const userMessage = getUserFriendlyErrorMessage(error, 'reject');
      setState(prev => ({ ...prev, error: userMessage }));
    }
  }, [state.allSuggestions, config.postId, optimizedState, optimisticResolution]);

  /**
   * Delete a suggestion permanently
   */
  const deleteSuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = state.allSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      console.warn('Suggestion not found:', suggestionId);
      const errorMessage = 'This suggestion is no longer available. It may have been already processed.';
      setState(prev => ({ ...prev, error: errorMessage }));
      return;
    }

    if (!config.postId) {
      console.error('Post ID is required for suggestion actions');
      const errorMessage = 'Unable to delete suggestion. Please save your post first and try again.';
      setState(prev => ({ ...prev, error: errorMessage }));
      return;
    }

    try {
      // Remove from local state optimistically
      setState(prev => ({
        ...prev,
        allSuggestions: prev.allSuggestions.filter(s => s.id !== suggestionId),
        acceptedSuggestions: prev.acceptedSuggestions.filter(id => id !== suggestionId),
        rejectedSuggestions: prev.rejectedSuggestions.filter(id => id !== suggestionId),
        error: null // Clear any previous errors
      }));

      // Update optimized state
      optimizedState.markDeleted(suggestionId);

      // Use optimistic resolution for backend update
      optimisticResolution.resolveSuggestion(config.postId, suggestionId, 'deleted');

      // Call success callback
      config.onSuccess?.('delete', suggestionId);

    } catch (error: any) {
      console.error('Failed to delete suggestion:', error);
      const userMessage = getUserFriendlyErrorMessage(error, 'delete');
      setState(prev => ({ ...prev, error: userMessage }));
    }
  }, [state.allSuggestions, config.postId, optimizedState, optimisticResolution]);

  /**
   * Undo the most recent suggestion acceptance
   */
  const undoLastAcceptance = useCallback(() => {
    const lastUndo = state.undoHistory[0];
    if (!lastUndo) {
      console.warn('No undo actions available');
      return;
    }

    try {
      // Restore original content
      onContentChange(lastUndo.originalContent);

      // Remove from accepted suggestions (suggestion will appear in filtered view)
      setState(prev => ({
        ...prev,
        acceptedSuggestions: prev.acceptedSuggestions.filter(id => id !== lastUndo.suggestionId),
        undoHistory: prev.undoHistory.slice(1)
      }));

    } catch (error: any) {
      console.error('Failed to undo suggestion acceptance:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to undo suggestion'
      }));
    }
  }, [state.undoHistory, onContentChange]);

  /**
   * Undo a specific suggestion acceptance by ID
   */
  const undoAcceptance = useCallback((undoId: string) => {
    const undoAction = state.undoHistory.find(u => u.id === undoId);
    if (!undoAction) {
      console.warn('Undo action not found:', undoId);
      return;
    }

    try {
      // This is more complex as we need to handle multiple undos
      // For now, we'll only support undoing the most recent action
      if (state.undoHistory[0]?.id === undoId) {
        undoLastAcceptance();
      } else {
        console.warn('Can only undo the most recent suggestion acceptance');
      }
    } catch (error: any) {
      console.error('Failed to undo specific suggestion acceptance:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to undo suggestion'
      }));
    }
  }, [state.undoHistory, undoLastAcceptance]);

  /**
   * Clear all undo history
   */
  const clearUndoHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      undoHistory: []
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Batch resolve multiple suggestions efficiently
   */
  const batchResolveSuggestions = useCallback(async (
    resolutions: Array<{ suggestionId: string; action: 'accepted' | 'rejected' | 'deleted'; }>
  ) => {
    if (!config.postId) {
      console.error('Post ID is required for suggestion actions');
      const errorMessage = 'Unable to resolve suggestions. Please save your post first and try again.';
      setState(prev => ({ ...prev, error: errorMessage }));
      return;
    }

    try {
      // Work on a mutable copy of suggestions for correct offset adjustments
      let workingSuggestions: Suggestion[] = [...state.allSuggestions];
      let newContent = content;

      // Process accepted suggestions first in increasing startOffset order
      const acceptedResolutions = resolutions
        .filter(r => r.action === 'accepted')
        .map(r => r.suggestionId);

      const acceptedSorted = workingSuggestions
        .filter(s => acceptedResolutions.includes(s.id))
        .sort((a, b) => a.startOffset - b.startOffset);

      for (const s of acceptedSorted) {
        // Apply to current content using current offsets
        newContent = suggestionService.applySuggestion(newContent, s);

        // Recalculate remaining suggestion offsets and drop overlaps
        const { startOffset, endOffset, replaceWith } = s;
        const delta = replaceWith.length - (endOffset - startOffset);

        workingSuggestions = workingSuggestions.map((other) => {
          if (other.id === s.id) return other;

          const overlaps = !(other.endOffset <= startOffset || other.startOffset >= endOffset);
          if (overlaps) return null as any;

          if (other.startOffset >= endOffset) {
            return {
              ...other,
              startOffset: other.startOffset + delta,
              endOffset: other.endOffset + delta
            };
          }
          return other;
        }).filter((x): x is Suggestion => Boolean(x));
      }

      // Update content if there were accepted suggestions
      if (acceptedSorted.length > 0) {
        onContentChange(newContent);
      }

      // Apply rejections/deletions and mark accepted in state
      setState(prev => {
        let newAccepted = [...prev.acceptedSuggestions];
        let newRejected = [...prev.rejectedSuggestions];
        let newAllSuggestions = [...workingSuggestions];

        resolutions.forEach(({ suggestionId, action }) => {
          // Remove from arrays first
          newAccepted = newAccepted.filter(id => id !== suggestionId);
          newRejected = newRejected.filter(id => id !== suggestionId);

          switch (action) {
            case 'accepted':
              newAccepted.push(suggestionId);
              break;
            case 'rejected':
              newRejected.push(suggestionId);
              break;
            case 'deleted':
              newAllSuggestions = newAllSuggestions.filter(s => s.id !== suggestionId);
              break;
          }
        });

        return {
          ...prev,
          acceptedSuggestions: newAccepted,
          rejectedSuggestions: newRejected,
          allSuggestions: newAllSuggestions,
          error: null
        };
      });

      // Keep optimized state in sync
      optimizedState.updateSuggestions(workingSuggestions);
      optimizedState.batchMarkSuggestions(resolutions);

      // Use optimistic resolution for backend updates
      optimisticResolution.batchResolveSuggestions(config.postId, resolutions);

      // Call success callback for each resolution
      resolutions.forEach(({ suggestionId, action }) => {
        config.onSuccess?.(action, suggestionId);
      });

    } catch (error: any) {
      console.error('Failed to batch resolve suggestions:', error);
      const userMessage = getUserFriendlyErrorMessage(error, 'resolve');
      setState(prev => ({ ...prev, error: userMessage }));
    }
  }, [state.allSuggestions, content, onContentChange, config.postId, optimizedState, optimisticResolution]);

  /**
   * Clear persisted state
   */
  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem(persistenceKey);
    } catch (error) {
      console.warn('Failed to clear persisted suggestion state:', error);
    }
  }, [persistenceKey]);

  /**
   * Get filtered suggestions (excluding accepted/rejected) - using optimized state
   */
  const activeSuggestions = useMemo(() => {
    // Use optimized state if available, fallback to legacy calculation
    if (optimizedState.activeSuggestions.length > 0 || state.allSuggestions.length === 0) {
      return optimizedState.activeSuggestions;
    }

    return state.allSuggestions.filter(
      suggestion =>
        !state.acceptedSuggestions.includes(suggestion.id) &&
        !state.rejectedSuggestions.includes(suggestion.id)
    );
  }, [optimizedState.activeSuggestions, state.allSuggestions, state.acceptedSuggestions, state.rejectedSuggestions]);

  /**
   * Get suggestion statistics - using optimized state for better performance
   */
  const stats = useMemo(() => {
    // Use optimized state stats if available
    const optimizedStats = optimizedState.stats;

    return {
      total: optimizedStats.active,
      accepted: optimizedStats.accepted,
      rejected: optimizedStats.rejected,
      canUndo: state.undoHistory.length > 0,
      byType: optimizedStats.byType,
      // Additional stats from optimistic resolution
      pending: optimisticResolution.optimisticResolutions.filter(r => r.isOptimistic).length,
      failed: optimisticResolution.optimisticResolutions.filter(r => r.error && !r.isOptimistic).length
    };
  }, [optimizedState.stats, state.undoHistory, optimisticResolution.optimisticResolutions]);

  // Memoize hasActiveSuggestions to prevent re-calculations
  const hasActiveSuggestions = useMemo(() => activeSuggestions.length > 0, [activeSuggestions.length]);

  // Cleanup on unmount - ensure proper cleanup of AbortController and request manager
  useEffect(() => {
    return () => {
      // Abort any pending requests
      if (requestManagerRef.current.currentController) {
        requestManagerRef.current.currentController.abort();
      }

      // Clean up request manager to prevent memory leaks
      requestManagerRef.current = {
        currentController: null,
        currentPostId: null,
        isRequestInProgress: false
      };
    };
  }, []);

  return {
    // State
    suggestions: activeSuggestions,
    summary: state.summary,
    isLoading: state.isLoading,
    error: state.error,
    undoHistory: state.undoHistory,

    // Actions
    loadSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    deleteSuggestion,
    batchResolveSuggestions, // New batch resolution method
    undoLastAcceptance,
    undoAcceptance,
    clearUndoHistory,
    clearError,
    clearPersistedState,

    // Computed values
    stats,
    canUndo: state.undoHistory.length > 0,
    hasActiveSuggestions,

    // Enhanced state access
    optimizedState: {
      suggestionsByType: optimizedState.suggestionsByType,
      isSuggestionInState: optimizedState.isSuggestionInState,
      getSuggestionsByState: optimizedState.getSuggestionsByState
    },

    // Optimistic resolution access
    optimisticResolution: {
      isOptimisticallyResolved: optimisticResolution.isOptimisticallyResolved,
      getOptimisticResolution: optimisticResolution.getOptimisticResolution,
      getQueueStats: optimisticResolution.getQueueStats
    }
  };
}
