import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Suggestion } from '../types';
import { useSuggestionScrollToActive } from './useScrollToActive';

/**
 * State for tracking active suggestion and navigation
 */
export interface ActiveSuggestionState {
  activeSuggestionId: string | null;
  currentIndex: number;
  availableSuggestions: string[]; // IDs of unresolved suggestions
  resolvedSuggestions: string[]; // IDs of resolved suggestions (accepted/rejected)
}

/**
 * Navigation context for the active suggestion
 */
export interface SuggestionNavigationContext {
  currentIndex: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Configuration for the ActiveSuggestionManager
 */
export interface ActiveSuggestionManagerConfig {
  suggestions: Suggestion[];
  autoAdvanceDelay?: number; // Delay before auto-advancing to next suggestion (default: 300ms)
  enableAutoAdvance?: boolean; // Whether to auto-advance after resolution (default: true)
  enableScrollToActive?: boolean; // Whether to scroll to active suggestion (default: true)
  scrollToActiveDelay?: number; // Delay before scrolling to active suggestion (default: 200ms)
  onActiveSuggestionChange?: (suggestionId: string | null) => void;
  onSuggestionResolved?: (suggestionId: string, remainingCount: number) => void;
  onAllSuggestionsResolved?: () => void;
}

/**
 * Hook for managing active suggestion state and navigation
 * Focuses on one suggestion at a time with navigation controls
 */
export function useActiveSuggestionManager(config: ActiveSuggestionManagerConfig) {
  const {
    suggestions,
    autoAdvanceDelay = 300,
    enableAutoAdvance = true,
    enableScrollToActive = true,
    scrollToActiveDelay = 200,
    onActiveSuggestionChange,
    onSuggestionResolved,
    onAllSuggestionsResolved
  } = config;

  // Initialize scroll-to-active functionality
  const { scrollToActiveWithNavigation, cancelScroll, cleanup } = useSuggestionScrollToActive({
    delay: scrollToActiveDelay,
    offset: 120, // Account for headers and active suggestion area
    visibilityMargin: 100
  });

  const [state, setState] = useState<ActiveSuggestionState>({
    activeSuggestionId: null,
    currentIndex: -1,
    availableSuggestions: [],
    resolvedSuggestions: []
  });

  const [lastNavigationDirection, setLastNavigationDirection] = useState<'forward' | 'backward' | 'none'>('none');

  /**
   * Get available suggestions (unresolved) - memoized for performance
   */
  const availableSuggestions = useMemo(() => {
    return suggestions.filter(
      suggestion => !state.resolvedSuggestions.includes(suggestion.id)
    );
  }, [suggestions, state.resolvedSuggestions]);

  /**
   * Update available suggestion IDs when suggestions change
   */
  useEffect(() => {
    const newAvailableIds = availableSuggestions.map(s => s.id);

    setState(prev => {
      // If current active suggestion is no longer available, reset
      const isActiveStillAvailable = prev.activeSuggestionId &&
        newAvailableIds.includes(prev.activeSuggestionId);

      if (!isActiveStillAvailable && newAvailableIds.length > 0) {
        // Set first available suggestion as active
        const newActiveSuggestionId = newAvailableIds[0];
        return {
          ...prev,
          activeSuggestionId: newActiveSuggestionId,
          currentIndex: 0,
          availableSuggestions: newAvailableIds
        };
      } else if (!isActiveStillAvailable && newAvailableIds.length === 0) {
        // No suggestions available
        return {
          ...prev,
          activeSuggestionId: null,
          currentIndex: -1,
          availableSuggestions: newAvailableIds
        };
      } else {
        // Update available suggestions but keep current active if still valid
        const currentIndex = prev.activeSuggestionId ?
          newAvailableIds.indexOf(prev.activeSuggestionId) : -1;

        return {
          ...prev,
          currentIndex,
          availableSuggestions: newAvailableIds
        };
      }
    });
  }, [availableSuggestions]);

  /**
   * Get the currently active suggestion object
   */
  const activeSuggestion = useMemo(() => {
    if (!state.activeSuggestionId) return null;
    return availableSuggestions.find(s => s.id === state.activeSuggestionId) || null;
  }, [state.activeSuggestionId, availableSuggestions]);

  /**
   * Get navigation context for the active suggestion
   */
  const navigationContext = useMemo((): SuggestionNavigationContext => {
    const totalCount = availableSuggestions.length;
    const currentIndex = state.currentIndex;

    return {
      currentIndex: currentIndex >= 0 ? currentIndex : 0,
      totalCount,
      hasNext: currentIndex < totalCount - 1,
      hasPrevious: currentIndex > 0
    };
  }, [state.currentIndex, availableSuggestions.length]);

  /**
   * Set a specific suggestion as active
   */
  const setActiveSuggestion = useCallback((suggestionId: string | null) => {
    if (!suggestionId) {
      setState(prev => ({
        ...prev,
        activeSuggestionId: null,
        currentIndex: -1
      }));
      onActiveSuggestionChange?.(null);
      return;
    }

    const index = state.availableSuggestions.indexOf(suggestionId);
    if (index === -1) {
      console.warn('Suggestion not found in available suggestions:', suggestionId);
      return;
    }

    setState(prev => ({
      ...prev,
      activeSuggestionId: suggestionId,
      currentIndex: index
    }));

    onActiveSuggestionChange?.(suggestionId);

    // Scroll to active suggestion if enabled
    if (enableScrollToActive) {
      scrollToActiveWithNavigation(suggestionId);
    }
  }, [state.availableSuggestions, onActiveSuggestionChange, enableScrollToActive, scrollToActiveWithNavigation]);

  /**
   * Mark a suggestion as resolved (accepted or rejected)
   */
  const resolveSuggestion = useCallback((suggestionId: string, autoAdvance: boolean = enableAutoAdvance) => {
    setState(prev => {
      const newResolvedSuggestions = [...prev.resolvedSuggestions, suggestionId];
      const newAvailableSuggestions = prev.availableSuggestions.filter(id => id !== suggestionId);

      // Call resolution callback
      onSuggestionResolved?.(suggestionId, newAvailableSuggestions.length);

      // Check if all suggestions are resolved
      if (newAvailableSuggestions.length === 0) {
        onAllSuggestionsResolved?.();
        return {
          ...prev,
          resolvedSuggestions: newResolvedSuggestions,
          availableSuggestions: newAvailableSuggestions,
          activeSuggestionId: null,
          currentIndex: -1
        };
      }

      // If this was the active suggestion, handle auto-advancement
      if (prev.activeSuggestionId === suggestionId && autoAdvance) {
        // Find next suggestion to activate
        let nextIndex = prev.currentIndex;

        // If we're at or past the end, go to the previous available suggestion
        if (nextIndex >= newAvailableSuggestions.length) {
          nextIndex = newAvailableSuggestions.length - 1;
        }

        const nextSuggestionId = newAvailableSuggestions[nextIndex];

        // Use setTimeout for auto-advancement delay to provide user feedback
        if (autoAdvanceDelay > 0) {
          setTimeout(() => {
            setState(current => ({
              ...current,
              activeSuggestionId: nextSuggestionId,
              currentIndex: nextIndex
            }));
            onActiveSuggestionChange?.(nextSuggestionId);

            // Scroll to the auto-advanced suggestion if enabled
            if (enableScrollToActive) {
              scrollToActiveWithNavigation(nextSuggestionId);
            }
          }, autoAdvanceDelay);

          // Keep current active during delay for visual feedback
          return {
            ...prev,
            resolvedSuggestions: newResolvedSuggestions,
            availableSuggestions: newAvailableSuggestions,
            activeSuggestionId: prev.activeSuggestionId,
            currentIndex: prev.currentIndex
          };
        } else {
          // Immediate advancement
          onActiveSuggestionChange?.(nextSuggestionId);

          // Scroll to the immediately advanced suggestion if enabled
          if (enableScrollToActive) {
            scrollToActiveWithNavigation(nextSuggestionId);
          }

          return {
            ...prev,
            resolvedSuggestions: newResolvedSuggestions,
            availableSuggestions: newAvailableSuggestions,
            activeSuggestionId: nextSuggestionId,
            currentIndex: nextIndex
          };
        }
      } else if (prev.activeSuggestionId === suggestionId) {
        // No auto-advance requested
        return {
          ...prev,
          resolvedSuggestions: newResolvedSuggestions,
          availableSuggestions: newAvailableSuggestions,
          activeSuggestionId: null,
          currentIndex: -1
        };
      } else {
        // Different suggestion was resolved, just update lists and adjust current index
        const currentIndex = prev.activeSuggestionId ?
          newAvailableSuggestions.indexOf(prev.activeSuggestionId) : -1;

        return {
          ...prev,
          resolvedSuggestions: newResolvedSuggestions,
          availableSuggestions: newAvailableSuggestions,
          currentIndex
        };
      }
    });
  }, [enableAutoAdvance, autoAdvanceDelay, onActiveSuggestionChange, onSuggestionResolved, onAllSuggestionsResolved, enableScrollToActive, scrollToActiveWithNavigation]);

  // Cleanup scroll functionality on unmount
  useEffect(() => {
    return () => {
      cancelScroll();
      cleanup();
    };
  }, [cancelScroll, cleanup]);

  /**
   * Check if a suggestion is resolved
   */
  const isSuggestionResolved = useCallback((suggestionId: string): boolean => {
    return state.resolvedSuggestions.includes(suggestionId);
  }, [state.resolvedSuggestions]);

  /**
   * Get all resolved suggestion IDs
   */
  const getResolvedSuggestions = useCallback((): string[] => {
    return [...state.resolvedSuggestions];
  }, [state.resolvedSuggestions]);

  /**
   * Navigate to the next available suggestion
   */
  const navigateNext = useCallback(() => {
    if (!navigationContext.hasNext) {
      console.warn('Cannot navigate next: already at last suggestion');
      return false;
    }

    const nextIndex = state.currentIndex + 1;
    const nextSuggestionId = state.availableSuggestions[nextIndex];

    if (nextSuggestionId) {
      setState(prev => ({
        ...prev,
        activeSuggestionId: nextSuggestionId,
        currentIndex: nextIndex
      }));
      onActiveSuggestionChange?.(nextSuggestionId);

      // Set navigation direction
      setLastNavigationDirection('forward');

      // Scroll to the next suggestion if enabled
      if (enableScrollToActive) {
        scrollToActiveWithNavigation(nextSuggestionId);
      }

      return true;
    }

    return false;
  }, [navigationContext.hasNext, state.currentIndex, state.availableSuggestions, onActiveSuggestionChange, enableScrollToActive, scrollToActiveWithNavigation]);

  /**
   * Navigate to the previous available suggestion
   */
  const navigatePrevious = useCallback(() => {
    if (!navigationContext.hasPrevious) {
      console.warn('Cannot navigate previous: already at first suggestion');
      return false;
    }

    const prevIndex = state.currentIndex - 1;
    const prevSuggestionId = state.availableSuggestions[prevIndex];

    if (prevSuggestionId) {
      setState(prev => ({
        ...prev,
        activeSuggestionId: prevSuggestionId,
        currentIndex: prevIndex
      }));
      onActiveSuggestionChange?.(prevSuggestionId);

      // Set navigation direction
      setLastNavigationDirection('backward');

      // Scroll to the previous suggestion if enabled
      if (enableScrollToActive) {
        scrollToActiveWithNavigation(prevSuggestionId);
      }

      return true;
    }

    return false;
  }, [navigationContext.hasPrevious, state.currentIndex, state.availableSuggestions, onActiveSuggestionChange, enableScrollToActive, scrollToActiveWithNavigation]);

  /**
   * Navigate to a specific index in the available suggestions
   */
  const navigateToIndex = useCallback((index: number) => {
    if (index < 0 || index >= state.availableSuggestions.length) {
      console.warn('Cannot navigate to index: out of bounds', index);
      return false;
    }

    const suggestionId = state.availableSuggestions[index];
    if (suggestionId) {
      setState(prev => ({
        ...prev,
        activeSuggestionId: suggestionId,
        currentIndex: index
      }));
      onActiveSuggestionChange?.(suggestionId);

      // Scroll to the suggestion at the specified index if enabled
      if (enableScrollToActive) {
        scrollToActiveWithNavigation(suggestionId);
      }

      return true;
    }

    return false;
  }, [state.availableSuggestions, onActiveSuggestionChange, enableScrollToActive, scrollToActiveWithNavigation]);

  /**
   * Navigate to the first available suggestion
   */
  const navigateToFirst = useCallback(() => {
    return navigateToIndex(0);
  }, [navigateToIndex]);

  /**
   * Navigate to the last available suggestion
   */
  const navigateToLast = useCallback(() => {
    return navigateToIndex(state.availableSuggestions.length - 1);
  }, [navigateToIndex, state.availableSuggestions.length]);

  /**
   * Resolve suggestion without auto-advancement (for manual control)
   */
  const resolveSuggestionManually = useCallback((suggestionId: string) => {
    return resolveSuggestion(suggestionId, false);
  }, [resolveSuggestion]);

  /**
   * Force auto-advance to next suggestion (for manual triggering)
   */
  const forceAdvanceToNext = useCallback(() => {
    if (navigationContext.hasNext) {
      return navigateNext();
    } else if (state.availableSuggestions.length > 0) {
      // If at end, go to first
      return navigateToFirst();
    }
    return false;
  }, [navigationContext.hasNext, navigateNext, navigateToFirst, state.availableSuggestions.length]);

  /**
   * Reset all resolved suggestions (for testing or refresh)
   */
  const resetResolvedSuggestions = useCallback(() => {
    setState(prev => ({
      ...prev,
      resolvedSuggestions: [],
      availableSuggestions: suggestions.map(s => s.id)
    }));
  }, [suggestions]);

  return {
    // Current state
    activeSuggestion,
    activeSuggestionId: state.activeSuggestionId,
    navigationContext,
    availableSuggestions,

    // Navigation methods
    navigateNext,
    navigatePrevious,
    navigateToIndex,
    navigateToFirst,
    navigateToLast,

    // State management methods
    setActiveSuggestion,
    resolveSuggestion,
    resolveSuggestionManually,
    forceAdvanceToNext,
    isSuggestionResolved,
    getResolvedSuggestions,
    resetResolvedSuggestions,

    // Scroll functionality
    scrollToActiveWithNavigation,
    cancelScroll,

    // Computed values
    hasActiveSuggestion: !!state.activeSuggestionId,
    totalAvailable: availableSuggestions.length,
    totalResolved: state.resolvedSuggestions.length,
    lastNavigationDirection
  };
}
