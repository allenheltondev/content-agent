import { useEffect, useRef, useCallback } from 'react';
import { useApiMutation } from './useApi';
import { apiService } from '../services/ApiService';
import type { BlogPost, UpdatePostRequest } from '../types';

interface UseAutoSaveOptions {
  postId: string;
  title: string;
  content: string;
  onSaveSuccess?: (post: BlogPost) => void;
  onSaveError?: (error: string) => void;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  forceSave: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for auto-saving blog post content with debouncing
 */
export function useAutoSave({
  postId,
  title,
  content,
  onSaveSuccess,
  onSaveError,
  debounceMs = 2000, // 2 seconds default
  enabled = true
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const { loading: isSaving, error: saveError, mutate, clearError } = useApiMutation<BlogPost>();
  const lastSavedRef = useRef<Date | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<{ title: string; content: string } | null>(null);

  // Save function
  const savePost = useCallback(async (forceUpdate = false) => {
    if (!enabled || !postId) return;

    const currentData = { title: title.trim(), content: content.trim() };

    // Skip save if content hasn't changed (unless forced)
    if (!forceUpdate && lastSavedContentRef.current &&
        lastSavedContentRef.current.title === currentData.title &&
        lastSavedContentRef.current.content === currentData.content) {
      return;
    }

    const updateData: UpdatePostRequest = {
      title: currentData.title,
      body: currentData.content
    };

    const result = await mutate(
      (signal) => apiService.updatePost(postId, updateData, signal),
      {
        onSuccess: (savedPost) => {
          lastSavedRef.current = new Date();
          lastSavedContentRef.current = currentData;
          onSaveSuccess?.(savedPost);
        },
        onError: (error) => {
          onSaveError?.(error.message || 'Failed to save post');
        },
        logContext: 'auto-save'
      }
    );

    return result;
  }, [enabled, postId, title, content, mutate, onSaveSuccess, onSaveError]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled || !postId || (!title.trim() && !content.trim())) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      savePost(false);
    }, debounceMs);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [title, content, enabled, postId, debounceMs, savePost]);

  // Force save function (for manual saves)
  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await savePost(true);
  }, [savePost]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved: lastSavedRef.current,
    saveError,
    forceSave,
    clearError
  };
}
