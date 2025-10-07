import { useState, useEffect, useCallback, useRef } from 'react';

interface DraftData {
  title: string;
  content: string;
  timestamp: number;
}

interface UseIntelligentDraftRecoveryOptions {
  draftData: DraftData | null;
  ageThresholdMs?: number;
  showDelayMs?: number;
  onShow?: () => void;
  onDismiss?: () => void;
}

interface UseIntelligentDraftRecoveryReturn {
  shouldShowDialog: boolean;
  isVisible: boolean;
  isDraftRelevant: boolean;
  draftAge: number;
  handleDismiss: () => void;
  handleRecover: () => void;
  handleDiscard: () => void;
}

/**
 * Hook for managing intelligent draft recovery dialog visibility
 * Implements age-based thresholds, delayed appearance, and session dismissal tracking
 */
export function useIntelligentDraftRecovery({
  draftData,
  ageThresholdMs = 5000, // 5 seconds
  showDelayMs = 500, // 500ms delay
  onShow,
  onDismiss
}: UseIntelligentDraftRecoveryOptions): UseIntelligentDraftRecoveryReturn {
  const [shouldShowDialog, setShouldShowDialog] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStorageKey = 'draft_recovery_dismissed';

  // Calculate draft age
  const draftAge = draftData ? Date.now() - draftData.timestamp : 0;

  // Check if draft is relevant (older than threshold)
  const isDraftRelevant = draftData !== null && draftAge > ageThresholdMs;

  // Load session dismissal state on mount
  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(sessionStorageKey);
      if (dismissed === 'true') {
        setSessionDismissed(true);
      }
    } catch (error) {
      console.warn('Failed to load session dismissal state:', error);
    }
  }, [sessionStorageKey]);

  // Main logic for determining dialog visibility
  useEffect(() => {
    // Clear any existing timeout
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    // Reset states
    setShouldShowDialog(false);
    setIsVisible(false);

    // Don't show if no draft data
    if (!draftData) {
      return;
    }

    // Don't show if already dismissed in this session
    if (sessionDismissed) {
      return;
    }

    // Don't show if draft is too recent
    if (!isDraftRelevant) {
      return;
    }

    // Draft is relevant, show after delay
    setShouldShowDialog(true);

    showTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      onShow?.();
    }, showDelayMs);

    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
        showTimeoutRef.current = null;
      }
    };
  }, [draftData, sessionDismissed, isDraftRelevant, showDelayMs, onShow]);

  // Handle dialog dismissal
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setShouldShowDialog(false);
    setSessionDismissed(true);

    // Store dismissal state in session storage
    try {
      sessionStorage.setItem(sessionStorageKey, 'true');
    } catch (error) {
      console.warn('Failed to store session dismissal state:', error);
    }

    onDismiss?.();
  }, [sessionStorageKey, onDismiss]);

  // Handle draft recovery
  const handleRecover = useCallback(() => {
    setIsVisible(false);
    setShouldShowDialog(false);
    setSessionDismissed(true);

    // Store dismissal state to prevent re-appearance
    try {
      sessionStorage.setItem(sessionStorageKey, 'true');
    } catch (error) {
      console.warn('Failed to store session dismissal state:', error);
    }
  }, [sessionStorageKey]);

  // Handle draft discard
  const handleDiscard = useCallback(() => {
    setIsVisible(false);
    setShouldShowDialog(false);
    setSessionDismissed(true);

    // Store dismissal state to prevent re-appearance
    try {
      sessionStorage.setItem(sessionStorageKey, 'true');
    } catch (error) {
      console.warn('Failed to store session dismissal state:', error);
    }
  }, [sessionStorageKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) {
        clearTimeout(showTimeoutRef.current);
      }
    };
  }, []);

  return {
    shouldShowDialog,
    isVisible,
    isDraftRelevant,
    draftAge,
    handleDismiss,
    handleRecover,
    handleDiscard
  };
}
