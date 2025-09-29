import { useState, useCallback, useRef, useEffect } from 'react';
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
  suggestions: Suggestion[];
  acceptedSuggestions: string[];
  rejectedSuggestions: string[];
  undoHistory: SuggestionUndoAction[];
  isLoading: boolean;
  error: string | null;
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
    suggestions: [],
    acceptedSuggestions: [],
    rejectedSuggestions: [],
    undoHistory: [],
    isLoading: false,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const persistenceKey = `suggestion_state_${config.postId}`;

  // Load persisted state on mount
  useEffect(() => {
    if (config.persistState) {
      loadPersistedState();
    }
  }, [config.postId, config.persistState]);

  // Persist state changes
  useEffect(() => {
    if (config.persistState && config.postId) {
      persistState();
    }
  }, [state.acceptedSuggestions, state.rejectedSuggestions, state.undoHistory, config.persistState, config.postId]);

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

  /**
   * Load suggestions from API
   */
  const loadSuggestions = useCallback(async () => {
    if (!config.postId) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const suggestions = await apiService.getSuggestions(
        config.postId,
        abortControllerRef.current.signal
      );

      // Filter out already accepted or rejected suggestions
      const filteredSuggestions = suggestions.filter(
        suggestion =>
          !state.acceptedSuggestions.includes(suggestion.id) &&
          !state.rejectedSuggestions.includes(suggestion.id)
      );

      setState(prev => ({
        ...prev,
        suggestions: filteredSuggestions,
        isLoading: false
      }));
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load suggestions:', error);
        setState(prev => ({
          ...prev,
          error: error.message || 'Failed to load suggestions',
          isLoading: false
        }));
      }
    }
  }, [config.postId, state.acceptedSuggestions, state.rejectedSuggestions]);

  /**
   * Accept a suggestion and apply it to content
   */
  const acceptSuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = state.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      console.warn('Suggestion not found:', suggestionId);
      return;
    }

    try {
      // Apply suggestion to content
      const newContent = suggestionService.applySuggestion(content, suggestion);

      // Create undo action
      const undoAction: SuggestionUndoAction = {
        id: `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
          suggestions: prev.suggestions.filter(s => s.id !== suggestionId),
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
  }, [state.suggestions, content, onContentChange, config.maxUndoHistory]);

  /**
   * Reject a suggestion and remove it from UI
   */
  const rejectSuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = state.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      console.warn('Suggestion not found:', suggestionId);
      return;
    }

    try {
      // Update state
      setState(prev => ({
        ...prev,
        suggestions: prev.suggestions.filter(s => s.id !== suggestionId),
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
  }, [state.suggestions]);

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

      // Restore suggestion to the list
      setState(prev => ({
        ...prev,
        suggestions: [lastUndo.suggestion, ...prev.suggestions],
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
   * Get filtered suggestions (excluding accepted/rejected)
   */
  const getActiveSuggestions = useCallback(() => {
    return state.suggestions.filter(
      suggestion =>
        !state.acceptedSuggestions.includes(suggestion.id) &&
        !state.rejectedSuggestions.includes(suggestion.id)
    );
  }, [state.suggestions, state.acceptedSuggestions, state.rejectedSuggestions]);

  /**
   * Get suggestion statistics
   */
  const getStats = useCallback(() => {
    const activeSuggestions = getActiveSuggestions();
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
  }, [getActiveSuggestions, state.acceptedSuggestions, state.rejectedSuggestions, state.undoHistory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    suggestions: getActiveSuggestions(),
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
    stats: getStats(),
    canUndo: state.undoHistory.length > 0,
    hasActiveSuggestions: getActiveSuggestions().length > 0
  };
}
