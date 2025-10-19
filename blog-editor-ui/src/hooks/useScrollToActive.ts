import { useCallback, useRef } from 'react';

/**
 * Configuration for scroll-to-active behavior
 */
export interface ScrollToActiveConfig {
  /**
   * Smooth scrolling behavior
   */
  behavior?: 'smooth' | 'instant' | 'auto';

  /**
   * Block alignment for scrolling
   */
  block?: 'start' | 'center' | 'end' | 'nearest';

  /**
   * Inline alignment for scrolling
   */
  inline?: 'start' | 'center' | 'end' | 'nearest';

  /**
   * Offset from the top when scrolling (in pixels)
   */
  offset?: number;

  /**
   * Whether to check if element is already visible before scrolling
   */
  checkVisibility?: boolean;

  /**
   * Margin around the element to consider it "visible" (in pixels)
   */
  visibilityMargin?: number;

  /**
   * Delay before scrolling (in milliseconds)
   */
  delay?: number;

  /**
   * Whether to scroll the container or the window
   */
  scrollContainer?: HTMLElement | null;
}

/**
 * Default configuration for scroll-to-active
 */
const DEFAULT_CONFIG: Required<ScrollToActiveConfig> = {
  behavior: 'smooth',
  block: 'center',
  inline: 'nearest',
  offset: 0,
  checkVisibility: true,
  visibilityMargin: 50,
  delay: 0,
  scrollContainer: null
};

/**
 * Hook for managing scroll-to-active functionality
 * Provides smooth scrolling to bring active suggestion highlights into view
 */
export function useScrollToActive(config: ScrollToActiveConfig = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check if an element is currently visible in the viewport or container
   */
  const isElementVisible = useCallback((element: HTMLElement): boolean => {
    if (!finalConfig.checkVisibility) {
      return false; // Always scroll if visibility check is disabled
    }

    const container = finalConfig.scrollContainer || document.documentElement;
    const containerRect = container === document.documentElement
      ? { top: 0, left: 0, bottom: window.innerHeight, right: window.innerWidth }
      : container.getBoundingClientRect();

    const elementRect = element.getBoundingClientRect();
    const margin = finalConfig.visibilityMargin;

    // Check if element is within the visible area with margin
    const isVisible = (
      elementRect.top >= containerRect.top - margin &&
      elementRect.bottom <= containerRect.bottom + margin &&
      elementRect.left >= containerRect.left - margin &&
      elementRect.right <= containerRect.right + margin
    );

    return isVisible;
  }, [finalConfig.checkVisibility, finalConfig.scrollContainer, finalConfig.visibilityMargin]);

  /**
   * Scroll to a specific element
   */
  const scrollToElement = useCallback((element: HTMLElement) => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const performScroll = () => {
      try {
        // Check if element is already visible
        if (isElementVisible(element)) {
          console.log('Element already visible, skipping scroll');
          return;
        }

        // Calculate scroll position with offset
        const elementRect = element.getBoundingClientRect();

        if (finalConfig.scrollContainer) {
          // Scroll within a container
          const containerRect = finalConfig.scrollContainer.getBoundingClientRect();
          const scrollTop = finalConfig.scrollContainer.scrollTop +
            elementRect.top - containerRect.top - finalConfig.offset;

          finalConfig.scrollContainer.scrollTo({
            top: scrollTop,
            behavior: finalConfig.behavior
          });
        } else {
          // Scroll the window
          const scrollTop = window.pageYOffset + elementRect.top - finalConfig.offset;

          window.scrollTo({
            top: scrollTop,
            behavior: finalConfig.behavior
          });
        }

        console.log('Scrolled to active suggestion element');
      } catch (error) {
        console.error('Failed to scroll to element:', error);

        // Fallback: use scrollIntoView
        try {
          element.scrollIntoView({
            behavior: finalConfig.behavior,
            block: finalConfig.block,
            inline: finalConfig.inline
          });
        } catch (fallbackError) {
          console.error('Fallback scroll also failed:', fallbackError);
        }
      }
    };

    // Apply delay if specified
    if (finalConfig.delay > 0) {
      scrollTimeoutRef.current = setTimeout(performScroll, finalConfig.delay);
    } else {
      performScroll();
    }
  }, [finalConfig, isElementVisible]);

  /**
   * Scroll to active suggestion by suggestion ID
   */
  const scrollToActiveSuggestion = useCallback((suggestionId: string) => {
    // Find the suggestion element by data attribute
    const suggestionElement = document.querySelector(
      `[data-suggestion-id="${suggestionId}"]`
    ) as HTMLElement;

    if (!suggestionElement) {
      console.warn('Active suggestion element not found:', suggestionId);
      return false;
    }

    scrollToElement(suggestionElement);
    return true;
  }, [scrollToElement]);

  /**
   * Scroll to active suggestion by element selector
   */
  const scrollToActiveBySelector = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement;

    if (!element) {
      console.warn('Element not found for selector:', selector);
      return false;
    }

    scrollToElement(element);
    return true;
  }, [scrollToElement]);

  /**
   * Scroll to the first highlighted suggestion
   */
  const scrollToFirstSuggestion = useCallback(() => {
    const firstSuggestion = document.querySelector(
      '[data-suggestion-id]'
    ) as HTMLElement;

    if (!firstSuggestion) {
      console.warn('No suggestion elements found');
      return false;
    }

    scrollToElement(firstSuggestion);
    return true;
  }, [scrollToElement]);

  /**
   * Cancel any pending scroll operation
   */
  const cancelScroll = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }
  }, []);

  /**
   * Check if a suggestion is currently visible
   */
  const isSuggestionVisible = useCallback((suggestionId: string): boolean => {
    const suggestionElement = document.querySelector(
      `[data-suggestion-id="${suggestionId}"]`
    ) as HTMLElement;

    if (!suggestionElement) {
      return false;
    }

    return isElementVisible(suggestionElement);
  }, [isElementVisible]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    cancelScroll();
  }, [cancelScroll]);

  return {
    // Core scroll functions
    scrollToElement,
    scrollToActiveSuggestion,
    scrollToActiveBySelector,
    scrollToFirstSuggestion,

    // Utility functions
    isElementVisible,
    isSuggestionVisible,
    cancelScroll,
    cleanup,

    // Configuration
    config: finalConfig
  };
}

/**
 * Hook specifically for suggestion navigation with scroll-to-active
 */
export function useSuggestionScrollToActive(config: ScrollToActiveConfig = {}) {
  const scrollConfig = {
    behavior: 'smooth' as const,
    block: 'center' as const,
    offset: 100, // Offset from top to account for headers
    checkVisibility: true,
    visibilityMargin: 80,
    delay: 150, // Small delay to allow DOM updates
    ...config
  };

  const {
    scrollToActiveSuggestion,
    isSuggestionVisible,
    cancelScroll,
    cleanup
  } = useScrollToActive(scrollConfig);

  /**
   * Scroll to active suggestion with navigation-specific behavior
   */
  const scrollToActiveWithNavigation = useCallback((suggestionId: string | null) => {
    if (!suggestionId) {
      return false;
    }

    // Check if already visible to avoid unnecessary scrolling
    if (isSuggestionVisible(suggestionId)) {
      console.log('Active suggestion already visible, skipping scroll');
      return true;
    }

    return scrollToActiveSuggestion(suggestionId);
  }, [scrollToActiveSuggestion, isSuggestionVisible]);

  return {
    scrollToActiveWithNavigation,
    isSuggestionVisible,
    cancelScroll,
    cleanup
  };
}
