import { useCallback, useRef, useEffect } from 'react';
import type { EditorMode } from '../contexts/EditorModeContext';

/**
 * Hook for managing focus during mode transitions and accessibility
 */
export const useFocusManagement = () => {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store the currently focused element
  const storeFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  // Restore focus to the previously focused element
  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current && document.contains(previousFocusRef.current)) {
      // Clear any existing timeout
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }

      // Use setTimeout to ensure the element is ready to receive focus
      focusTimeoutRef.current = setTimeout(() => {
        previousFocusRef.current?.focus();
        previousFocusRef.current = null;
      }, 100);
    }
  }, []);

  // Focus the mode toggle button
  const focusModeToggle = useCallback(() => {
    const modeToggle = document.querySelector('[aria-label="Edit mode"], [aria-label="Review mode"]') as HTMLElement;
    if (modeToggle) {
      modeToggle.focus();
    }
  }, []);

  // Focus the content editor based on mode
  const focusContentEditor = useCallback((mode: EditorMode) => {
    // Clear any existing timeout
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = setTimeout(() => {
      if (mode === 'edit') {
        // Focus the content editor for editing
        const contentEditor = document.querySelector('[data-testid="content-editor"], .content-editor, textarea[name="content"]') as HTMLElement;
        if (contentEditor) {
          contentEditor.focus();
        }
      } else {
        // In review mode, focus the first suggestion or suggestions panel
        const firstSuggestion = document.querySelector('[data-suggestion-id]') as HTMLElement;
        const suggestionsPanel = document.querySelector('[data-testid="suggestions-panel"], .suggestions-panel') as HTMLElement;

        if (firstSuggestion) {
          firstSuggestion.focus();
        } else if (suggestionsPanel) {
          suggestionsPanel.focus();
        }
      }
    }, 200); // Longer delay to ensure mode transition is complete
  }, []);

  // Handle focus during mode transitions
  const handleModeTransitionFocus = useCallback((
    _fromMode: EditorMode,
    toMode: EditorMode,
    isTransitioning: boolean
  ) => {
    if (isTransitioning) {
      // Store current focus when transition starts
      storeFocus();
    } else {
      // Restore or set appropriate focus when transition completes
      if (toMode === 'edit') {
        focusContentEditor('edit');
      } else {
        focusContentEditor('review');
      }
    }
  }, [storeFocus, focusContentEditor]);

  // Focus trap for modal-like states (if needed)
  const createFocusTrap = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    // Focus the first element
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  // Skip to content functionality
  const skipToContent = useCallback(() => {
    const contentEditor = document.querySelector('[data-testid="content-editor"], .content-editor') as HTMLElement;
    if (contentEditor) {
      contentEditor.focus();
      contentEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Skip to suggestions functionality
  const skipToSuggestions = useCallback(() => {
    const suggestionsPanel = document.querySelector('[data-testid="suggestions-panel"], .suggestions-panel') as HTMLElement;
    const firstSuggestion = document.querySelector('[data-suggestion-id]') as HTMLElement;

    if (firstSuggestion) {
      firstSuggestion.focus();
      firstSuggestion.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (suggestionsPanel) {
      suggestionsPanel.focus();
      suggestionsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  return {
    storeFocus,
    restoreFocus,
    focusModeToggle,
    focusContentEditor,
    handleModeTransitionFocus,
    createFocusTrap,
    skipToContent,
    skipToSuggestions,
  };
};
