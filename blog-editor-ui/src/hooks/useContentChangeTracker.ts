import { useCallback, useRef, useEffect } from 'react';
import { useEditorMode } from '../contexts/EditorModeContext';

/**
 * Hook for tracking content changes in the editor
 * Automatically integrates with EditorModeProvider to track diffs
 */
export function useContentChangeTracker() {
  const { trackContentChange, currentMode } = useEditorMode();
  const previousContentRef = useRef<string>('');
  const isInitializedRef = useRef(false);

  // Initialize the tracker with initial content
  const initializeTracker = useCallback((initialContent: string) => {
    previousContentRef.current = initialContent;
    isInitializedRef.current = true;
  }, []);

  // Track a content change
  const trackChange = useCallback((newContent: string) => {
    // Only track changes in Edit mode
    if (currentMode !== 'edit') {
      return;
    }

    // Skip if not initialized
    if (!isInitializedRef.current) {
      previousContentRef.current = newContent;
      isInitializedRef.current = true;
      return;
    }

    // Track the change if content is different
    if (previousContentRef.current !== newContent) {
      trackContentChange(previousContentRef.current, newContent);
      previousContentRef.current = newContent;
    }
  }, [currentMode, trackContentChange]);

  // Reset tracker (useful when switching modes or loading new content)
  const resetTracker = useCallback((newContent?: string) => {
    if (newContent !== undefined) {
      previousContentRef.current = newContent;
    }
    isInitializedRef.current = newContent !== undefined;
  }, []);

  // Get the current tracked content
  const getCurrentContent = useCallback(() => {
    return previousContentRef.current;
  }, []);

  // Update content without tracking (useful for programmatic changes)
  const updateContentSilently = useCallback((newContent: string) => {
    previousContentRef.current = newContent;
  }, []);

  return {
    initializeTracker,
    trackChange,
    resetTracker,
    getCurrentContent,
    updateContentSilently,
    isTracking: currentMode === 'edit' && isInitializedRef.current
  };
}

/**
 * Hook for tracking content changes with debouncing
 * Useful for high-frequency updates like typing
 */
export function useDebouncedContentChangeTracker(debounceMs: number = 300) {
  const { trackContentChange, currentMode } = useEditorMode();
  const previousContentRef = useRef<string>('');
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);

  // Initialize the tracker with initial content
  const initializeTracker = useCallback((initialContent: string) => {
    previousContentRef.current = initialContent;
    isInitializedRef.current = true;
  }, []);

  // Track a content change with debouncing
  const trackChange = useCallback((newContent: string) => {
    // Only track changes in Edit mode
    if (currentMode !== 'edit') {
      return;
    }

    // Skip if not initialized
    if (!isInitializedRef.current) {
      previousContentRef.current = newContent;
      isInitializedRef.current = true;
      return;
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout for debounced tracking
    debounceTimeoutRef.current = setTimeout(() => {
      if (previousContentRef.current !== newContent) {
        trackContentChange(previousContentRef.current, newContent);
        previousContentRef.current = newContent;
      }
      debounceTimeoutRef.current = null;
    }, debounceMs);
  }, [currentMode, trackContentChange, debounceMs]);

  // Flush any pending changes immediately
  const flushChanges = useCallback((currentContent: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (isInitializedRef.current && previousContentRef.current !== currentContent) {
      trackContentChange(previousContentRef.current, currentContent);
      previousContentRef.current = currentContent;
    }
  }, [trackContentChange]);

  // Reset tracker
  const resetTracker = useCallback((newContent?: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    if (newContent !== undefined) {
      previousContentRef.current = newContent;
    }
    isInitializedRef.current = newContent !== undefined;
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    initializeTracker,
    trackChange,
    flushChanges,
    resetTracker,
    isTracking: currentMode === 'edit' && isInitializedRef.current
  };
}
