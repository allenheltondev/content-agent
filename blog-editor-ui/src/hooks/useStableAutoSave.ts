import { useRef, useCallback, useEffect } from 'react';
import { hasContentChanged, FlickerPrevention } from '../utils/renderStabilization';

interface UseStableAutoSaveOptions {
  onSave: (content: { title: string; content: string }) => Promise<void>;
  debounceMs?: number;
  preventFlicker?: boolean;
}

/**
 * Hook that provides stable auto-save functionality that doesn't cause visual flickering
 */
export function useStableAutoSave({
  onSave,
  debounceMs = 2000,
  preventFlicker = true
}: UseStableAutoSaveOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<{ title: string; content: string } | null>(null);
  const flickerPreventionRef = useRef(new FlickerPrevention(100)); // Prevent saves more frequent than 100ms
  const isSavingRef = useRef(false);

  // Stable save function that prevents visual flickering
  const stableSave = useCallback(async (title: string, content: string) => {
    // Prevent rapid successive saves that could cause flickering
    if (preventFlicker && !flickerPreventionRef.current.shouldAllow()) {
      return;
    }

    // Don't save if already saving
    if (isSavingRef.current) {
      return;
    }

    // Check if content has meaningfully changed
    const currentContent = { title, content };
    if (lastSavedContentRef.current) {
      const titleChanged = hasContentChanged(lastSavedContentRef.current.title, title);
      const contentChanged = hasContentChanged(lastSavedContentRef.current.content, content);

      if (!titleChanged && !contentChanged) {
        return; // No meaningful changes, skip save
      }
    }

    try {
      isSavingRef.current = true;
      await onSave(currentContent);
      lastSavedContentRef.current = currentContent;
    } catch (error) {
      console.error('Stable auto-save failed:', error);
      // Reset flicker prevention on error to allow retry
      flickerPreventionRef.current.reset();
      throw error;
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave, preventFlicker]);

  // Debounced save function
  const debouncedSave = useCallback((title: string, content: string) => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      stableSave(title, content);
    }, debounceMs);
  }, [stableSave, debounceMs]);

  // Force save function (bypasses debouncing and flicker prevention)
  const forceSave = useCallback(async (title: string, content: string) => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset flicker prevention to allow immediate save
    flickerPreventionRef.current.reset();

    await stableSave(title, content);
  }, [stableSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    debouncedSave,
    forceSave,
    isSaving: isSavingRef.current
  };
}
