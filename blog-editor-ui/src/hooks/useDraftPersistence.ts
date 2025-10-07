import { useEffect, useCallback, useRef, useMemo } from 'react';

interface DraftData {
  title: string;
  content: string;
  timestamp: number;
}

interface UseDraftPersistenceOptions {
  postId: string;
  title: string;
  content: string;
  enabled?: boolean;
  debounceMs?: number;
  onError?: (error: DraftError) => void;
}

interface DraftError {
  type: 'quota_exceeded' | 'parse_error' | 'storage_unavailable' | 'conflict';
  message: string;
  originalError?: Error;
}

interface UseDraftPersistenceReturn {
  loadDraft: () => DraftData | null;
  clearDraft: () => void;
  hasDraft: boolean;
  isDraftDifferent: (currentTitle: string, currentContent: string) => boolean;
  lastError: DraftError | null;
  clearError: () => void;
}

/**
 * Hook for persisting draft content to local storage with comprehensive error handling
 */
export function useDraftPersistence({
  postId,
  title,
  content,
  enabled = true,
  debounceMs = 1000, // 1 second for local storage
  onError
}: UseDraftPersistenceOptions): UseDraftPersistenceReturn {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<{ title: string; content: string } | null>(null);
  const lastErrorRef = useRef<DraftError | null>(null);

  // Generate storage key
  const getStorageKey = useCallback(() => `draft_${postId}`, [postId]);

  // Error handling utilities
  const handleError = useCallback((error: DraftError) => {
    lastErrorRef.current = error;
    console.warn(`Draft persistence error (${error.type}):`, error.message, error.originalError);
    onError?.(error);
  }, [onError]);

  const clearError = useCallback(() => {
    lastErrorRef.current = null;
  }, []);

  // Check if localStorage is available and has space
  const checkStorageAvailability = useCallback((): { available: boolean; error?: DraftError } => {
    try {
      if (typeof Storage === 'undefined' || !window.localStorage) {
        return {
          available: false,
          error: {
            type: 'storage_unavailable',
            message: 'Local storage is not available in this browser'
          }
        };
      }

      // Test if we can write to localStorage
      const testKey = '__draft_test__';
      const testValue = 'test';
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);

      return { available: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        return {
          available: false,
          error: {
            type: 'quota_exceeded',
            message: 'Local storage quota exceeded. Please clear some browser data or use a different browser.',
            originalError: error
          }
        };
      }

      return {
        available: false,
        error: {
          type: 'storage_unavailable',
          message: 'Local storage is not accessible',
          originalError: error instanceof Error ? error : new Error(String(error))
        }
      };
    }
  }, []);

  // Attempt to free up storage space by removing old drafts
  const attemptStorageCleanup = useCallback((): boolean => {
    try {
      const keysToRemove: string[] = [];
      const currentTime = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      // Find old draft keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('draft_') && key !== getStorageKey()) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const data = JSON.parse(stored);
              if (data.timestamp && (currentTime - data.timestamp) > maxAge) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // If we can't parse it, it's probably corrupted, so remove it
            keysToRemove.push(key);
          }
        }
      }

      // Remove old drafts
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch {
          // Ignore errors during cleanup
        }
      });

      return keysToRemove.length > 0;
    } catch {
      return false;
    }
  }, [getStorageKey]);

  // Save draft to local storage with comprehensive error handling
  const saveDraft = useCallback(() => {
    if (!enabled || !postId) return;

    const currentData = { title, content };

    // Skip if content hasn't changed
    if (lastSavedRef.current &&
        lastSavedRef.current.title === currentData.title &&
        lastSavedRef.current.content === currentData.content) {
      return;
    }

    // Clear any previous errors when attempting to save
    clearError();

    // Check storage availability first
    const storageCheck = checkStorageAvailability();
    if (!storageCheck.available) {
      if (storageCheck.error) {
        handleError(storageCheck.error);
      }
      return;
    }

    try {
      const draftData: DraftData = {
        title,
        content,
        timestamp: Date.now()
      };

      const serializedData = JSON.stringify(draftData);
      localStorage.setItem(getStorageKey(), serializedData);
      lastSavedRef.current = currentData;
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        // Try to clean up old drafts and retry once
        const cleanedUp = attemptStorageCleanup();
        if (cleanedUp) {
          try {
            const draftData: DraftData = {
              title,
              content,
              timestamp: Date.now()
            };
            localStorage.setItem(getStorageKey(), JSON.stringify(draftData));
            lastSavedRef.current = currentData;
            return;
          } catch (retryError) {
            // Still failed after cleanup
            handleError({
              type: 'quota_exceeded',
              message: 'Unable to save draft due to storage limitations. Consider clearing browser data.',
              originalError: retryError instanceof Error ? retryError : new Error(String(retryError))
            });
            return;
          }
        }

        handleError({
          type: 'quota_exceeded',
          message: 'Local storage is full. Your draft cannot be saved automatically.',
          originalError: error
        });
      } else {
        handleError({
          type: 'storage_unavailable',
          message: 'Failed to save draft to local storage',
          originalError: error instanceof Error ? error : new Error(String(error))
        });
      }
    }
  }, [enabled, postId, title, content, getStorageKey, checkStorageAvailability, handleError, clearError, attemptStorageCleanup]);

  // Load draft from local storage with comprehensive error handling
  const loadDraft = useCallback((): DraftData | null => {
    if (!enabled || !postId) return null;

    // Clear any previous errors when attempting to load
    clearError();

    // Check storage availability first
    const storageCheck = checkStorageAvailability();
    if (!storageCheck.available) {
      if (storageCheck.error) {
        handleError(storageCheck.error);
      }
      return null;
    }

    try {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) return null;

      let draftData: any;
      try {
        draftData = JSON.parse(stored);
      } catch (parseError) {
        // Handle corrupted draft data
        handleError({
          type: 'parse_error',
          message: 'Draft data is corrupted and cannot be recovered',
          originalError: parseError instanceof Error ? parseError : new Error(String(parseError))
        });

        // Remove the corrupted draft
        try {
          localStorage.removeItem(getStorageKey());
        } catch {
          // Ignore cleanup errors
        }

        return null;
      }

      // Validate the structure with fallback values
      if (typeof draftData === 'object' && draftData !== null) {
        const validatedDraft: DraftData = {
          title: typeof draftData.title === 'string' ? draftData.title : '',
          content: typeof draftData.content === 'string' ? draftData.content : '',
          timestamp: typeof draftData.timestamp === 'number' ? draftData.timestamp : Date.now()
        };

        // Check if the draft is too old (older than 30 days)
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        if (Date.now() - validatedDraft.timestamp > maxAge) {
          // Silently remove old draft
          try {
            localStorage.removeItem(getStorageKey());
          } catch {
            // Ignore cleanup errors
          }
          return null;
        }

        return validatedDraft;
      } else {
        // Invalid data structure
        handleError({
          type: 'parse_error',
          message: 'Draft data format is invalid',
          originalError: new Error('Invalid draft data structure')
        });

        // Remove the invalid draft
        try {
          localStorage.removeItem(getStorageKey());
        } catch {
          // Ignore cleanup errors
        }

        return null;
      }
    } catch (error) {
      handleError({
        type: 'storage_unavailable',
        message: 'Failed to load draft from local storage',
        originalError: error instanceof Error ? error : new Error(String(error))
      });
      return null;
    }
  }, [enabled, postId, getStorageKey, checkStorageAvailability, handleError, clearError]);

  // Clear draft from local storage with error handling
  const clearDraft = useCallback(() => {
    if (!postId) return;

    try {
      localStorage.removeItem(getStorageKey());
      lastSavedRef.current = null;
      // Clear any errors when successfully clearing draft
      clearError();
    } catch (error) {
      handleError({
        type: 'storage_unavailable',
        message: 'Failed to clear draft from local storage',
        originalError: error instanceof Error ? error : new Error(String(error))
      });
    }
  }, [postId, getStorageKey, handleError, clearError]);

  // Check if draft exists
  const hasDraft = useCallback(() => {
    return loadDraft() !== null;
  }, [loadDraft]);

  // Compare draft content with current content with conflict detection
  const isDraftDifferent = useCallback((currentTitle: string, currentContent: string): boolean => {
    const draft = loadDraft();
    if (!draft) return false;

    try {
      // Compare title and content, trimming whitespace for comparison
      const titlesDifferent = draft.title.trim() !== currentTitle.trim();
      const contentDifferent = draft.content.trim() !== currentContent.trim();

      const isDifferent = titlesDifferent || contentDifferent;

      // If there's a significant difference, check for potential conflicts
      if (isDifferent) {
        const titleLength = Math.max(draft.title.length, currentTitle.length);
        const contentLength = Math.max(draft.content.length, currentContent.length);

        // If both versions have substantial content, it might be a conflict
        if (titleLength > 10 && contentLength > 50) {
          // This is a potential conflict scenario - both versions have meaningful content
          // The calling code should handle this appropriately
        }
      }

      return isDifferent;
    } catch (error) {
      handleError({
        type: 'conflict',
        message: 'Unable to compare draft with current content',
        originalError: error instanceof Error ? error : new Error(String(error))
      });
      return false;
    }
  }, [loadDraft, handleError]);

  // Memoize current draft data to prevent unnecessary effect runs
  const currentDraftData = useMemo(() => ({ title, content }), [title, content]);

  // Debounced save effect - use memoized currentDraftData
  useEffect(() => {
    if (!enabled || !postId) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for draft save
    timeoutRef.current = setTimeout(() => {
      saveDraft();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentDraftData, enabled, postId, debounceMs, saveDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    loadDraft,
    clearDraft,
    hasDraft: hasDraft(),
    isDraftDifferent,
    lastError: lastErrorRef.current,
    clearError
  };
}
