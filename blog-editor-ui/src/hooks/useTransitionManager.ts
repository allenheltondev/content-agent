import { useCallback, useEffect, useState } from 'react';
import { useEditorMode } from '../contexts/EditorModeContext';
import { useEditorErrorHandling } from './useEditorErrorHandling';
import type { TransitionProgress } from '../services/ModeTransitionManager';

/**
 * Hook for managing mode transitions with enhanced UI feedback
 */
export function useTransitionManager() {
  const {
    isTransitioning,
    retryFailedTransition,
    cancelTransition,
    onTransitionProgress,
    lastTransitionError,
    clearTransitionError
  } = useEditorMode();

  const {
    executeRecoveryAction,
    fallbackModeActive,
    enableFallbackMode,
    disableFallbackMode
  } = useEditorErrorHandling();

  const [currentProgress, setCurrentProgress] = useState<TransitionProgress | null>(null);
  const [showRetryButton, setShowRetryButton] = useState(false);

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = onTransitionProgress((progress) => {
      setCurrentProgress(progress);

      // Show retry button for retryable errors
      if (progress.phase === 'error' && lastTransitionError) {
        setShowRetryButton(true);
      } else {
        setShowRetryButton(false);
      }
    });

    return unsubscribe;
  }, [onTransitionProgress, lastTransitionError]);

  // Clear progress when transition completes
  useEffect(() => {
    if (!isTransitioning) {
      setCurrentProgress(null);
    }
  }, [isTransitioning]);

  // Retry with error handling
  const handleRetry = useCallback(async () => {
    try {
      await retryFailedTransition();
      setShowRetryButton(false);
    } catch (error) {
      console.error('Retry failed:', error);
      // Error will be handled by the context
    }
  }, [retryFailedTransition]);

  // Cancel with confirmation
  const handleCancel = useCallback(() => {
    const cancelled = cancelTransition();
    if (cancelled) {
      setCurrentProgress(null);
      setShowRetryButton(false);
    }
    return cancelled;
  }, [cancelTransition]);

  // Dismiss error
  const handleDismissError = useCallback(() => {
    clearTransitionError();
    setShowRetryButton(false);
  }, [clearTransitionError]);

  // Enable fallback mode for degraded functionality
  const handleEnableFallback = useCallback(() => {
    enableFallbackMode();
    setShowRetryButton(false);
  }, [enableFallbackMode]);

  // Execute recovery action
  const handleRecoveryAction = useCallback(async (actionType: string) => {
    try {
      await executeRecoveryAction(actionType);
      setShowRetryButton(false);
    } catch (error) {
      console.error('Recovery action failed:', error);
    }
  }, [executeRecoveryAction]);

  return {
    // State
    isTransitioning,
    currentProgress,
    lastTransitionError,
    showRetryButton,
    fallbackModeActive,

    // Actions
    retry: handleRetry,
    cancel: handleCancel,
    dismissError: handleDismissError,
    enableFallback: handleEnableFallback,
    disableFallback: disableFallbackMode,
    executeRecoveryAction: handleRecoveryAction,

    // Computed values
    canCancel: currentProgress?.canCancel ?? false,
    progressPercentage: currentProgress?.progress ?? 0,
    progressMessage: currentProgress?.message ?? '',
    currentPhase: currentProgress?.phase ?? null,
  };
}

/**
 * Hook for displaying transition progress with visual feedback
 */
export function useTransitionProgressDisplay() {
  const { currentProgress, isTransitioning } = useTransitionManager();

  // Generate appropriate CSS classes for progress display
  const getProgressBarClass = useCallback(() => {
    if (!currentProgress) return '';

    const baseClass = 'transition-all duration-300 ease-in-out';

    switch (currentProgress.phase) {
      case 'starting':
        return `${baseClass} bg-blue-500`;
      case 'recalculating':
        return `${baseClass} bg-yellow-500`;
      case 'updating':
        return `${baseClass} bg-green-500`;
      case 'completing':
        return `${baseClass} bg-green-600`;
      case 'error':
        return `${baseClass} bg-red-500`;
      default:
        return `${baseClass} bg-gray-500`;
    }
  }, [currentProgress]);

  // Generate appropriate icon for current phase
  const getProgressIcon = useCallback(() => {
    if (!currentProgress) return null;

    switch (currentProgress.phase) {
      case 'starting':
        return '🔄';
      case 'recalculating':
        return '⚙️';
      case 'updating':
        return '📝';
      case 'completing':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  }, [currentProgress]);

  return {
    // Display state
    shouldShow: isTransitioning && currentProgress !== null,
    progressBarClass: getProgressBarClass(),
    progressIcon: getProgressIcon(),

    // Progress data
    progress: currentProgress?.progress ?? 0,
    message: currentProgress?.message ?? '',
    phase: currentProgress?.phase ?? null,
    canCancel: currentProgress?.canCancel ?? false,
  };
}

/**
 * Hook for handling transition errors with user-friendly messages
 */
export function useTransitionErrorHandler() {
  const { lastTransitionError, showRetryButton, retry, dismissError } = useTransitionManager();

  // Convert technical errors to user-friendly messages
  const getUserFriendlyError = useCallback((error: string | null): string | null => {
    if (!error) return null;

    // Map common technical errors to user-friendly messages
    const errorMappings: Record<string, string> = {
      'network': 'Network connection issue. Please check your internet connection.',
      'timeout': 'The operation took too long. Please try again.',
      'fetch': 'Unable to connect to the server. Please try again.',
      'service unavailable': 'The service is temporarily unavailable. Please try again later.',
      'internal server error': 'A server error occurred. Please try again.',
      'cancelled': 'The operation was cancelled.',
      'suggestion recalculation failed': 'Unable to update suggestions. You can continue editing and try again later.',
    };

    const lowerError = error.toLowerCase();
    for (const [key, message] of Object.entries(errorMappings)) {
      if (lowerError.includes(key)) {
        return message;
      }
    }

    // Return original error if no mapping found
    return error;
  }, []);

  return {
    // Error state
    hasError: !!lastTransitionError,
    errorMessage: getUserFriendlyError(lastTransitionError),
    canRetry: showRetryButton,

    // Actions
    retry,
    dismiss: dismissError,
  };
}
