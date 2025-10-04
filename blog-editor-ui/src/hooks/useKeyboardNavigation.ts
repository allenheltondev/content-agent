import { useEffect, useCallback, type RefObject } from 'react';
import { KEYBOARD_KEYS, focusManagement } from '../utils/accessibility';

interface UseKeyboardNavigationOptions {
  /**
   * Container element to scope keyboard navigation
   */
  containerRef?: RefObject<HTMLElement>;

  /**
   * Enable arrow key navigation for lists/grids
   */
  enableArrowKeys?: boolean;

  /**
   * Enable Home/End key navigation
   */
  enableHomeEnd?: boolean;

  /**
   * Enable Escape key handling
   */
  enableEscape?: boolean;

  /**
   * Callback when Escape is pressed
   */
  onEscape?: () => void;

  /**
   * Enable focus trapping (for modals, menus)
   */
  trapFocus?: boolean;

  /**
   * Selector for focusable elements
   */
  focusableSelector?: string;

  /**
   * Enable roving tabindex pattern
   */
  enableRovingTabindex?: boolean;
}

const DEFAULT_FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [role="button"], [role="menuitem"], [role="option"]';

/**
 * Hook for managing keyboard navigation patterns
 */
export const useKeyboardNavigation = (options: UseKeyboardNavigationOptions = {}) => {
  const {
    containerRef,
    enableArrowKeys = false,
    enableHomeEnd = false,
    enableEscape = false,
    onEscape,
    trapFocus = false,
    focusableSelector = DEFAULT_FOCUSABLE_SELECTOR,
    enableRovingTabindex = false,
  } = options;

  const getFocusableElements = useCallback((): HTMLElement[] => {
    const container = containerRef?.current || document;
    return Array.from(container.querySelectorAll(focusableSelector)) as HTMLElement[];
  }, [containerRef, focusableSelector]);

  const getCurrentIndex = useCallback((): number => {
    const focusableElements = getFocusableElements();
    return focusableElements.findIndex(element => element === document.activeElement);
  }, [getFocusableElements]);

  const focusElement = useCallback((index: number) => {
    const focusableElements = getFocusableElements();
    if (index >= 0 && index < focusableElements.length) {
      focusableElements[index].focus();
      return true;
    }
    return false;
  }, [getFocusableElements]);

  const handleArrowNavigation = useCallback((event: KeyboardEvent, direction: 'up' | 'down' | 'left' | 'right') => {
    if (!enableArrowKeys) return false;

    const currentIndex = getCurrentIndex();
    if (currentIndex === -1) return false;

    const focusableElements = getFocusableElements();
    let nextIndex: number;

    switch (direction) {
      case 'up':
      case 'left':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
        break;
      case 'down':
      case 'right':
        nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
        break;
      default:
        return false;
    }

    event.preventDefault();
    return focusElement(nextIndex);
  }, [enableArrowKeys, getCurrentIndex, getFocusableElements, focusElement]);

  const handleHomeEnd = useCallback((event: KeyboardEvent, key: 'Home' | 'End') => {
    if (!enableHomeEnd) return false;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return false;

    event.preventDefault();

    if (key === 'Home') {
      return focusElement(0);
    } else {
      return focusElement(focusableElements.length - 1);
    }
  }, [enableHomeEnd, getFocusableElements, focusElement]);

  const handleFocusTrapping = useCallback((event: KeyboardEvent) => {
    if (!trapFocus || event.key !== KEYBOARD_KEYS.TAB) return false;

    const container = containerRef?.current;
    if (!container) return false;

    focusManagement.trapFocus(container, event);
    return true;
  }, [trapFocus, containerRef]);

  const setupRovingTabindex = useCallback(() => {
    if (!enableRovingTabindex) return;

    const focusableElements = getFocusableElements();
    focusableElements.forEach((element, index) => {
      element.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
  }, [enableRovingTabindex, getFocusableElements]);

  const updateRovingTabindex = useCallback((activeIndex: number) => {
    if (!enableRovingTabindex) return;

    const focusableElements = getFocusableElements();
    focusableElements.forEach((element, index) => {
      element.setAttribute('tabindex', index === activeIndex ? '0' : '-1');
    });
  }, [enableRovingTabindex, getFocusableElements]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle escape key
      if (enableEscape && event.key === KEYBOARD_KEYS.ESCAPE) {
        event.preventDefault();
        onEscape?.();
        return;
      }

      // Handle focus trapping
      if (handleFocusTrapping(event)) {
        return;
      }

      // Handle arrow keys
      switch (event.key) {
        case KEYBOARD_KEYS.ARROW_UP:
          if (handleArrowNavigation(event, 'up')) {
            const newIndex = getCurrentIndex();
            updateRovingTabindex(newIndex);
          }
          break;
        case KEYBOARD_KEYS.ARROW_DOWN:
          if (handleArrowNavigation(event, 'down')) {
            const newIndex = getCurrentIndex();
            updateRovingTabindex(newIndex);
          }
          break;
        case KEYBOARD_KEYS.ARROW_LEFT:
          if (handleArrowNavigation(event, 'left')) {
            const newIndex = getCurrentIndex();
            updateRovingTabindex(newIndex);
          }
          break;
        case KEYBOARD_KEYS.ARROW_RIGHT:
          if (handleArrowNavigation(event, 'right')) {
            const newIndex = getCurrentIndex();
            updateRovingTabindex(newIndex);
          }
          break;
        case KEYBOARD_KEYS.HOME:
          if (handleHomeEnd(event, 'Home')) {
            updateRovingTabindex(0);
          }
          break;
        case KEYBOARD_KEYS.END:
          if (handleHomeEnd(event, 'End')) {
            const focusableElements = getFocusableElements();
            updateRovingTabindex(focusableElements.length - 1);
          }
          break;
      }
    };

    const container = containerRef?.current || document;
    container.addEventListener('keydown', handleKeyDown);

    // Setup roving tabindex on mount
    setupRovingTabindex();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enableEscape,
    onEscape,
    handleFocusTrapping,
    handleArrowNavigation,
    handleHomeEnd,
    getCurrentIndex,
    updateRovingTabindex,
    setupRovingTabindex,
    containerRef,
    getFocusableElements,
  ]);

  return {
    focusFirst: () => focusElement(0),
    focusLast: () => {
      const focusableElements = getFocusableElements();
      return focusElement(focusableElements.length - 1);
    },
    focusNext: () => {
      const currentIndex = getCurrentIndex();
      const focusableElements = getFocusableElements();
      const nextIndex = currentIndex < focusableElements.length - 1 ? currentIndex + 1 : 0;
      return focusElement(nextIndex);
    },
    focusPrevious: () => {
      const currentIndex = getCurrentIndex();
      const focusableElements = getFocusableElements();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusableElements.length - 1;
      return focusElement(prevIndex);
    },
    getCurrentIndex,
    getFocusableElements,
  };
};

/**
 * Hook for managing skip links
 */
export const useSkipLinks = () => {
  useEffect(() => {
    const skipLinks = document.querySelectorAll('[data-skip-link]');

    const handleSkipLinkClick = (event: Event) => {
      event.preventDefault();
      const target = (event.target as HTMLAnchorElement).getAttribute('href');
      if (target) {
        const targetElement = document.querySelector(target);
        if (targetElement) {
          (targetElement as HTMLElement).focus();
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    skipLinks.forEach(link => {
      link.addEventListener('click', handleSkipLinkClick);
    });

    return () => {
      skipLinks.forEach(link => {
        link.removeEventListener('click', handleSkipLinkClick);
      });
    };
  }, []);
};

/**
 * Hook for managing focus restoration
 */
export const useFocusRestore = (shouldRestore: boolean = true) => {
  useEffect(() => {
    if (!shouldRestore) return;

    const previousActiveElement = document.activeElement as HTMLElement;

    return () => {
      if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
        // Use setTimeout to ensure the element is still in the DOM
        setTimeout(() => {
          if (document.contains(previousActiveElement)) {
            previousActiveElement.focus();
          }
        }, 0);
      }
    };
  }, [shouldRestore]);
};
