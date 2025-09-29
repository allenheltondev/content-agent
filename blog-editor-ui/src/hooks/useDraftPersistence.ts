import { useEffect, useCallback, useRef } from 'react';

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
}

interface UseDraftPersistenceReturn {
  loadDraft: () => DraftData | null;
  clearDraft: () => void;
  hasDraft: boolean;
}

/**
 * Hook for persisting draft content to local storage
 */
export function useDraftPersistence({
  postId,
  title,
  content,
  enabled = true,
  debounceMs = 1000 // 1 second for local storage
}: UseDraftPersistenceOptions): UseDraftPersistenceReturn {
  const timeoutRef = useRef<number | null>(null);
  const lastSavedRef = useRef<{ title: string; content: string } | null>(null);

  // Generate storage key
  const getStorageKey = useCallback(() => `draft_${postId}`, [postId]);

  // Save draft to local storage
  const saveDraft = useCallback(() => {
    if (!enabled || !postId) return;

    const currentData = { title, content };

    // Skip if content hasn't changed
    if (lastSavedRef.current &&
        lastSavedRef.current.title === currentData.title &&
        lastSavedRef.current.content === currentData.content) {
      return;
    }

    try {
      const draftData: DraftData = {
        title,
        content,
        timestamp: Date.now()
      };

      localStorage.setItem(getStorageKey(), JSON.stringify(draftData));
      lastSavedRef.current = currentData;
    } catch (error) {
      console.warn('Failed to save draft to local storage:', error);
    }
  }, [enabled, postId, title, content, getStorageKey]);

  // Load draft from local storage
  const loadDraft = useCallback((): DraftData | null => {
    if (!enabled || !postId) return null;

    try {
      const stored = localStorage.getItem(getStorageKey());
      if (!stored) return null;

      const draftData: DraftData = JSON.parse(stored);

      // Validate the structure
      if (typeof draftData.title === 'string' &&
          typeof draftData.content === 'string' &&
          typeof draftData.timestamp === 'number') {
        return draftData;
      }
    } catch (error) {
      console.warn('Failed to load draft from local storage:', error);
    }

    return null;
  }, [enabled, postId, getStorageKey]);

  // Clear draft from local storage
  const clearDraft = useCallback(() => {
    if (!postId) return;

    try {
      localStorage.removeItem(getStorageKey());
      lastSavedRef.current = null;
    } catch (error) {
      console.warn('Failed to clear draft from local storage:', error);
    }
  }, [postId, getStorageKey]);

  // Check if draft exists
  const hasDraft = useCallback(() => {
    return loadDraft() !== null;
  }, [loadDraft]);

  // Debounced save effect
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
  }, [title, content, enabled, postId, debounceMs, saveDraft]);

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
    hasDraft: hasDraft()
  };
}
