import { useCallback, useRef } from 'react';

/**
 * Hook for making accessibility announcements to screen readers
 */
export const useAccessibilityAnnouncements = () => {
  const announcementRef = useRef<HTMLDivElement | null>(null);

  // Create or get the announcement element
  const getAnnouncementElement = useCallback(() => {
    if (!announcementRef.current) {
      // Check if element already exists in DOM
      let element = document.getElementById('accessibility-announcements') as HTMLDivElement;

      if (!element) {
        element = document.createElement('div');
        element.id = 'accessibility-announcements';
        element.setAttribute('aria-live', 'polite');
        element.setAttribute('aria-atomic', 'true');
        element.className = 'sr-only';
        element.style.cssText = `
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        `;
        document.body.appendChild(element);
      }

      announcementRef.current = element;
    }

    return announcementRef.current;
  }, []);

  // Make an announcement to screen readers
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const element = getAnnouncementElement();

    // Set the priority
    element.setAttribute('aria-live', priority);

    // Clear and set the message
    element.textContent = '';

    // Use setTimeout to ensure the screen reader picks up the change
    setTimeout(() => {
      element.textContent = message;
    }, 100);
  }, [getAnnouncementElement]);

  // Announce mode changes specifically
  const announceModeChange = useCallback((newMode: 'edit' | 'review', hasContentChanges?: boolean) => {
    let message = '';

    if (newMode === 'edit') {
      message = 'Switched to Edit mode. You can now modify your content. Suggestions are hidden.';
    } else {
      message = hasContentChanges
        ? 'Switched to Review mode. Recalculating suggestions based on your changes. Please wait.'
        : 'Switched to Review mode. You can now review suggestions. Content editing is disabled.';
    }

    announce(message, 'assertive');
  }, [announce]);

  // Announce transition states
  const announceTransitionState = useCallback((state: 'starting' | 'recalculating' | 'completed' | 'failed', mode?: 'edit' | 'review') => {
    let message = '';

    switch (state) {
      case 'starting':
        message = `Switching to ${mode} mode...`;
        break;
      case 'recalculating':
        message = 'Recalculating suggestions based on your content changes. Please wait.';
        break;
      case 'completed':
        message = `Mode switch completed. Now in ${mode} mode.`;
        break;
      case 'failed':
        message = 'Mode switch failed. Please try again or check for errors.';
        break;
    }

    announce(message, 'assertive');
  }, [announce]);

  // Announce suggestion recalculation results
  const announceSuggestionUpdate = useCallback((suggestionCount: number, newSuggestions: number = 0) => {
    let message = '';

    if (suggestionCount === 0) {
      message = 'No suggestions available for your content.';
    } else if (newSuggestions > 0) {
      message = `Suggestions updated. ${suggestionCount} total suggestions, ${newSuggestions} new suggestions added.`;
    } else {
      message = `${suggestionCount} suggestions available for review.`;
    }

    announce(message);
  }, [announce]);

  return {
    announce,
    announceModeChange,
    announceTransitionState,
    announceSuggestionUpdate,
  };
};
