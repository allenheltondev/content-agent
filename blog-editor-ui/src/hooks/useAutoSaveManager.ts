import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useApiMutation } from './useApi';
import { apiService } from '../services/ApiService';
import { useToast } from './useToast';
import type { BlogPost, CreatePostRequest, UpdatePostRequest } from '../types';

interface UseAutoSaveManagerOptions {
  postId: string | null;
  title: string;
  content: string;
  onSaveSuccess?: (post: BlogPost) => void;
  onSaveError?: (error: string) => void;
  onPostCreated?: (postId: string) => void;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveManagerReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  saveError: string | null;
  forceSave: () => Promise<void>;
  clearError: () => void;
}

interface SaveState {
  title: string;
  content: string;
}

/**
 * Enhanced auto-save hook with post ID generation and retry logic
 */
export function useAutoSaveManager({
  postId,
  title,
  content,
  onSaveSuccess,
  onSaveError,
  onPostCreated,
  debounceMs = 2000,
  enabled = true
}: UseAutoSaveManagerOptions): UseAutoSaveManagerReturn {
  const { loading: isSaving, error: saveError, mutate, clearError } = useApiMutation<BlogPost>();
  const { showSuccess, showError, showWarning } = useToast();

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<SaveState | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

  // Track unsaved changes - memoized to prevent unnecessary calculations
  const currentState = useMemo(() => ({
    title: title.trim(),
    content: content.trim()
  }), [title, content]);

  useEffect(() => {
    if (!lastSavedStateRef.current) {
      setHasUnsavedChanges(Boolean(currentState.title || currentState.content));
      return;
    }

    const hasChanges =
      lastSavedStateRef.current.title !== currentState.title ||
      lastSavedStateRef.current.content !== currentState.content;

    setHasUnsavedChanges(hasChanges);
  }, [currentState]);

  // Create new post when ID is missing
  const createPost = useCallback(async (postData: SaveState): Promise<BlogPost> => {
    const createRequest: CreatePostRequest = {
      title: postData.title,
      body: postData.content
    };

    const result = await mutate(
      (signal) => apiService.createPost(createRequest, signal),
      {
        onSuccess: (newPost) => {
          onPostCreated?.(newPost.id);
          showSuccess('Post created successfully');
        },
        onError: (error) => {
          showError(`Failed to create post: ${error.message}`);
        },
        logContext: 'auto-save-create'
      }
    );

    if (!result) {
      throw new Error('Failed to create post');
    }

    return result;
  }, [mutate, onPostCreated, showSuccess, showError]);

  // Update existing post
  const updatePost = useCallback(async (currentPostId: string, postData: SaveState): Promise<BlogPost> => {
    const updateRequest: UpdatePostRequest = {
      title: postData.title,
      body: postData.content
    };

    const result = await mutate(
      (signal) => apiService.updatePost(currentPostId, updateRequest, signal),
      {
        onError: (error) => {
          showError(`Failed to save post: ${error.message}`);
        },
        logContext: 'auto-save-update'
      }
    );

    if (!result) {
      throw new Error('Failed to update post');
    }

    return result;
  }, [mutate, showError]);

  // Save with retry logic
  const saveWithRetry = useCallback(async (postData: SaveState, forceUpdate = false): Promise<void> => {
    if (!enabled) return;

    // Skip save if content hasn't changed (unless forced)
    if (!forceUpdate && lastSavedStateRef.current &&
        lastSavedStateRef.current.title === postData.title &&
        lastSavedStateRef.current.content === postData.content) {
      return;
    }

    // Skip save if both title and content are empty
    if (!postData.title && !postData.content) {
      return;
    }

    try {
      let savedPost: BlogPost;

      if (!postId) {
        // Create new post if ID is missing
        savedPost = await createPost(postData);
      } else {
        // Update existing post
        savedPost = await updatePost(postId, postData);
      }

      // Success - reset retry count and update state
      retryCountRef.current = 0;
      setLastSaved(new Date());
      lastSavedStateRef.current = postData;
      setHasUnsavedChanges(false);
      onSaveSuccess?.(savedPost);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Check if we should retry
      if (retryCountRef.current < maxRetries) {
        const delay = retryDelays[retryCountRef.current];
        retryCountRef.current++;

        showWarning(`Save failed, retrying in ${delay / 1000}s... (attempt ${retryCountRef.current}/${maxRetries})`);

        setTimeout(() => {
          saveWithRetry(postData, forceUpdate);
        }, delay);
      } else {
        // Max retries reached
        retryCountRef.current = 0;
        onSaveError?.(errorMessage);
        showError('Failed to save after multiple attempts. Please try again manually.');
      }
    }
  }, [enabled, postId, createPost, updatePost, onSaveSuccess, onSaveError, showWarning, showError]);

  // Debounced auto-save effect - use memoized currentState to prevent unnecessary effect runs
  useEffect(() => {
    if (!enabled || (!currentState.title && !currentState.content)) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      saveWithRetry(currentState, false);
    }, debounceMs);

    // Cleanup timeout on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentState, enabled, debounceMs, saveWithRetry]);

  // Force save function (for manual saves) - use memoized currentState
  const forceSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    await saveWithRetry(currentState, true);
  }, [currentState, saveWithRetry]);

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
    lastSaved,
    hasUnsavedChanges,
    saveError,
    forceSave,
    clearError
  };
}
