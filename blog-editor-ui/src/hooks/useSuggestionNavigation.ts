import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Suggestion } from '../types';

/**
 * Configuration for suggestion navigation
 */
export interface SuggestionNavigationConfig {
  /**
   * Whether to auto-advance to next suggestion after accept/reject
   */
  autoAdvance?: boolean;

  /**
   * Whether to loop back to first suggestion when reaching the end
   */
  loopNavigation?: boolean;

  /**
   * Callback when suggestion changes
   */
  onSuggestionChange?: (suggestion: Suggestion | null, index: number) => void;
}

/**
 * Navigation state for suggestions
 */
export interface SuggestionNavigationState {
  currentIndex: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
  currentSuggestion: Suggestion | null;
}

/**
 * Hook for managing suggestion navigation with auto-advance functionality
 */
export function useSuggestionNavigation(
  suggestions: Suggestion[],
  config: SuggestionNavigationConfig = {}
) {
  const {
    autoAdvance = true,
    loopNavigation = false,
    onSuggestionChange
  } = config;

  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset index when suggestions change
  useEffect(() => {
    if (suggestions.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= suggestions.length) {
      // If current index is beyond the new suggestions array, reset to last valid index
      setCurrentIndex(Math.max(0, suggestions.length - 1));
    }

    // Notify about the current suggestion when suggestions change
    const currentSuggestion = suggestions[currentIndex] || null;
    onSuggestionChange?.(currentSuggestion, currentIndex);
  }, [suggestions, currentIndex, onSuggestionChange]);

  // Calculate navigation state
  const navigationState = useMemo((): SuggestionNavigationState => {
    const totalCount = suggestions.length;
    const hasNext = currentIndex < totalCount - 1;
    const hasPrevious = currentIndex > 0;
    const currentSuggestion = suggestions[currentIndex] || null;

    return {
      currentIndex,
      totalCount,
      hasNext,
      hasPrevious,
      currentSuggestion
    };
  }, [suggestions, currentIndex]);

  // Navigate to specific index
  const navigateToIndex = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, suggestions.length - 1));
    setCurrentIndex(clampedIndex);

    const suggestion = suggestions[clampedIndex] || null;
    onSuggestionChange?.(suggestion, clampedIndex);
  }, [suggestions, onSuggestionChange]);

  // Navigate to next suggestion
  const navigateNext = useCallback(() => {
    if (navigationState.hasNext) {
      navigateToIndex(currentIndex + 1);
    } else if (loopNavigation && suggestions.length > 0) {
      navigateToIndex(0);
    }
  }, [navigationState.hasNext, currentIndex, loopNavigation, suggestions.length, navigateToIndex]);

  // Navigate to previous suggestion
  const navigatePrevious = useCallback(() => {
    if (navigationState.hasPrevious) {
      navigateToIndex(currentIndex - 1);
    } else if (loopNavigation && suggestions.length > 0) {
      navigateToIndex(suggestions.length - 1);
    }
  }, [navigationState.hasPrevious, currentIndex, loopNavigation, suggestions.length, navigateToIndex]);

  // Navigate by direction
  const navigate = useCallback((direction: 'next' | 'previous') => {
    if (direction === 'next') {
      navigateNext();
    } else {
      navigatePrevious();
    }
  }, [navigateNext, navigatePrevious]);

  // Auto-advance after suggestion resolution
  const handleSuggestionResolved = useCallback((resolvedSuggestionId: string) => {
    if (!autoAdvance) return;

    // Find the index of the resolved suggestion
    const resolvedIndex = suggestions.findIndex(s => s.id === resolvedSuggestionId);
    if (resolvedIndex === -1) return;

    // If the resolved suggestion is the current one, advance to next
    if (resolvedIndex === currentIndex) {
      // After a suggestion is resolved, the suggestions array will be updated
      // We need to handle this in the next render cycle
      setTimeout(() => {
        // If there are still suggestions and we're not at the end, stay at current index
        // (the next suggestion will now be at the current index)
        // If we were at the last suggestion, move to the previous one
        if (suggestions.length > 1) {
          if (currentIndex >= suggestions.length - 1) {
            // We were at the last suggestion, move to previous
            navigateToIndex(Math.max(0, currentIndex - 1));
          }
          // Otherwise, stay at current index (next suggestion is now there)
        } else {
          // No more suggestions, reset to 0
          setCurrentIndex(0);
        }
      }, 0);
    }
  }, [autoAdvance, suggestions, currentIndex, navigateToIndex]);

  // Navigate to specific suggestion by ID
  const navigateToSuggestion = useCallback((suggestionId: string) => {
    const index = suggestions.findIndex(s => s.id === suggestionId);
    if (index !== -1) {
      navigateToIndex(index);
    }
  }, [suggestions, navigateToIndex]);

  // Get suggestion at specific index
  const getSuggestionAtIndex = useCallback((index: number): Suggestion | null => {
    return suggestions[index] || null;
  }, [suggestions]);

  // Reset navigation to first suggestion
  const resetNavigation = useCallback(() => {
    navigateToIndex(0);
  }, [navigateToIndex]);

  return {
    // Navigation state
    ...navigationState,

    // Navigation actions
    navigate,
    navigateNext,
    navigatePrevious,
    navigateToIndex,
    navigateToSuggestion,
    resetNavigation,

    // Suggestion resolution handling
    handleSuggestionResolved,

    // Utility functions
    getSuggestionAtIndex,

    // Configuration
    config: {
      autoAdvance,
      loopNavigation
    }
  };
}
