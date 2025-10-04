import { useCallback, useEffect, useState } from 'react';
import { LocalStorageManager, type NewPostDraft } from '../utils/localStorage';

interface UseNewPostDraftOptions {
  title: string;
  content: string;
  enabled?: boolean;
  debounceMs?: number;
}

interface UseNewPostDraftReturn {
  loadDraft: () => NewPostDraft | null;
  clearDraft: () => void;
  hasDraft: boolean;
  hasRecentDraft: boolean;
  showRecoveryPrompt: boolean;
  recoverDraft: () => boolean;
  dismissRecoveryPrompt: () => void;
}

/**
 * Hook for managing new post draft persistence and recovery
 */
export function useNewPostDraft({
  title,
  content,
  enabled = true,
  debounceMs = 2000 // 2 seconds for new post drafts
}: UseNewPostDraftOptions): UseNewPostDraftReturn {
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [hasCheckedForDraft, setHasCheckedForDraft] = useState(false);

  // Load draft from localStorage
  const loadDraft = useCallback((): NewPostDraft | null => {
    if (!enabled) return null;
    return LocalStorageManager.getNewPostDraft();
  }, [enabled]);

  // Clear draft from localStorage
  const clearDraft = useCallback(() => {
    LocalStorageManager.clearNewPostDraft();
    setShowRecoveryPrompt(false);
  }, []);

  // Check if draft exists
  const hasDraft = useCallback(() => {
    return loadDraft() !== null;
  }, [loadDraft]);

  // Check if recent draft exists
  const hasRecentDraft = useCallback(() => {
    return LocalStorageManager.hasRecentNewPostDraft();
  }, []);

  // Recover draft data
  const recoverDraft = useCallback((): boolean => {
    const draft = loadDraft();
    if (draft) {
      setShowRecoveryPrompt(false);
      return true;
    }
    return false;
  }, [loadDraft]);

  // Dismiss recovery prompt
  const dismissRecoveryPrompt = useCallback(() => {
    setShowRecoveryPrompt(false);
  }, []);

  // Auto-save draft data when content changes
  useEffect(() => {
    if (!enabled) return;

    const hasContent = title.trim() || content.trim();

    if (hasContent) {
      const timeoutId = setTimeout(() => {
        LocalStorageManager.saveNewPostDraft({
          title,
          content
        });
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    } else {
      // Clear draft if no content
      LocalStorageManager.clearNewPostDraft();
    }
  }, [title, content, enabled, debounceMs]);

  // Check for recoverable data on mount
  useEffect(() => {
    if (!enabled || hasCheckedForDraft) return;

    const checkRecoverableData = () => {
      const hasRecentData = hasRecentDraft();

      if (hasRecentData) {
        // Show recovery prompt if there's recent data and current form is empty
        const isEmpty = !title.trim() && !content.trim();
        setShowRecoveryPrompt(isEmpty);
      }

      setHasCheckedForDraft(true);
    };

    // Small delay to allow component to initialize
    const timeoutId = setTimeout(checkRecoverableData, 100);
    return () => clearTimeout(timeoutId);
  }, [enabled, hasCheckedForDraft, hasRecentDraft, title, content]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Perform cleanup of old drafts when component unmounts
      LocalStorageManager.cleanupOldDrafts();
    };
  }, []);

  return {
    loadDraft,
    clearDraft,
    hasDraft: hasDraft(),
    hasRecentDraft: hasRecentDraft(),
    showRecoveryPrompt,
    recoverDraft,
    dismissRecoveryPrompt
  };
}
