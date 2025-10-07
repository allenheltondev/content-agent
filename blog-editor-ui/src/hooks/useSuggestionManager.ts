import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { Suggestion } from '../types';
import { suggestionService } from '../services/SuggestionService';
import { apiService } from '../services/ApiService';

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
}

/**
 * Hook for managing suggestion acceptance, rejection, and undo functionality
 */
export function useSuggestionManager(
  content: string,
  onContentChange: (content: string) => void,
  config: SuggestionManagerConfig
) {
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
    if (!config.postId) return;

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

      // Store all suggestions and summary from API response
      setState(prev => ({
        ...prev,
        allSuggestions: response.suggestions,
        summary: response.summary,
        isLoading: false
      }));

      // Mark request as complete and clean up controller reference
      requestManagerRef.current.isRequestInProgress = false;
      requestManagerRef.current.currentController = null;
    } catch (error: any) {
      // Mark request as complete and clean up controller reference
      requestManagerRef.current.isRequestInProgress = false;
      requestManagerRef.current.currentController = null;

      if (error.name !== 'AbortError') {
        console.error('Failed to load suggestions:', error);
        setState(prev => ({
          ...prev,
          error: error.message || 'Failed to load suggestions',
          isLoading: false
        }));
      } else {
        // Silent handling of abort errors
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }
  }, [config.postId]); // Only depend on postId

  /**
   * Accept a suggestion and apply it to content
   */
  const acceptSuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = state.allSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      console.warn('Suggestion not found:', suggestionId);
      return;
    }

    try {
      // Apply suggestion to content
      const newContent = suggestionService.applySuggestion(content, suggestion);

      // Create undo action
      const undoAction: SuggestionUndoAction = {
        id: `undo_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        suggestionId,
        originalContent: content,
        newContent,
        suggestion,
        timestamp: Date.now()
      };

      // Update state
      setState(prev => {
        const newUndoHistory = [undoAction, ...prev.undoHistory].slice(0, config.maxUndoHistory);

        return {
          ...prev,
          acceptedSuggestions: [...prev.acceptedSuggestions, suggestionId],
          undoHistory: newUndoHistory
        };
      });

      // Update content
      onContentChange(newContent);

      // Delete suggestion from backend
      try {
        await apiService.deleteSuggestion(suggestionId);
      } catch (error) {
        console.warn('Failed to delete suggestion from backend:', error);
        // Don't fail the acceptance if backend deletion fails
      }

    } catch (error: any) {
      console.error('Failed to accept suggestion:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to accept suggestion'
      }));
    }
  }, [state.allSuggestions, content, onContentChange, config.maxUndoHistory]);

  /**
   * Reject a suggestion and remove it from UI
   */
  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = state.allSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      console.warn('Suggestion not found:', suggestionId);
      return;
    }

    try {
      // Update state
      setState(prev => ({
        ...prev,
        rejectedSuggestions: [...prev.rejectedSuggestions, suggestionId]
      }));

      // Delete suggestion from backend
      try {
        await apiService.deleteSuggestion(suggestionId);
      } catch (error) {
        console.warn('Failed to delete suggestion from backend:', error);
        // Don't fail the rejection if backend deletion fails
      }

    } catch (error: any) {
      console.error('Failed to reject suggestion:', error);
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to reject suggestion'
      }));
    }
  }, [state.allSuggestions]);

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
   * Get filtered suggestions (excluding accepted/rejected) - memoized to prevent re-calculations
   */
  const activeSuggestions = useMemo(() => {
    return state.allSuggestions.filter(
      suggestion =>
        !state.acceptedSuggestions.includes(suggestion.id) &&
        !state.rejectedSuggestions.includes(suggestion.id)
    );
  }, [state.allSuggestions, state.acceptedSuggestions, state.rejectedSuggestions]);

  /**
   * Get suggestion statistics - memoized to prevent re-calculations
   */
  const stats = useMemo(() => {
    return {
      total: activeSuggestions.length,
      accepted: state.acceptedSuggestions.length,
      rejected: state.rejectedSuggestions.length,
      canUndo: state.undoHistory.length > 0,
      byType: {
        llm: activeSuggestions.filter(s => s.type === 'llm').length,
        brand: activeSuggestions.filter(s => s.type === 'brand').length,
        fact: activeSuggestions.filter(s => s.type === 'fact').length,
        grammar: activeSuggestions.filter(s => s.type === 'grammar').length,
        spelling: activeSuggestions.filter(s => s.type === 'spelling').length
      }
    };
  }, [activeSuggestions, state.acceptedSuggestions, state.rejectedSuggestions, state.undoHistory]);

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
    undoLastAcceptance,
    undoAcceptance,
    clearUndoHistory,
    clearError,
    clearPersistedState,

    // Computed values
    stats,
    canUndo: state.undoHistory.length > 0,
    hasActiveSuggestions
  };
}
