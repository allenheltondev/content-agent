import { useCallback, useState, useEffect } from 'react';
import { useToastContext } from '../contexts/ToastContext';
import { editorErrorHandler, type EditorError, type EditorErrorType } from '../services/EditorErrorHandler';
import { editorFeedbackService, type SuccessNotificationType } from '../services/EditorFeedbackService';

/**
 * Error handling state
 */
interface ErrorHandlingState {
  currentError: EditorError | null;
  errorHistory: EditorError[];
  isRecovering: boolean;
  fallbackModeActive: boolean;
}

/**
 * Hook for comprehensive editor error handling and user feedback
 */
export function useEditorErrorHandling() {
  const { showError, showSuccess, showWarning } = useToastContext();

  const [state, setState] = useState<ErrorHandlingState>({
    currentError: null,
    errorHistory: [],
    isRecovering: false,
    fallbackModeActive: false,
  });

  // Update error history when it changes
  useEffect(() => {
    const history = editorErrorHandler.getErrorHistory();
    setState(prev => ({ ...prev, errorHistory: history }));
  }, []);

  // Update fallback mode status
  useEffect(() => {
    const fallbackActive = editorErrorHandler.isFallbackModeActive();
    setState(prev => ({ ...prev, fallbackModeActive: fallbackActive }));
  }, []);

  /**
   * Handle an error with comprehensive feedback and recovery options
   */
  const handleError = useCallback(async (
    error: Error | string,
    type: EditorErrorType,
    context?: Record<string, any>
  ): Promise<EditorError> => {
    const errorInfo = editorErrorHandler.handleError(error, type, context);

    setState(prev => ({
      ...prev,
      currentError: errorInfo,
      errorHistory: editorErrorHandler.getErrorHistory(),
    }));

    // Show toast notification for the error
    const toastMessage = editorErrorHandler.toToastMessage(errorInfo);
    showError(toastMessage.message, toastMessage.duration);

    // Check if we should attempt automatic retry
    if (editorErrorHandler.shouldAutoRetry(errorInfo)) {
      try {
        setState(prev => ({ ...prev, isRecovering: true }));

        // Record the retry attempt
        editorErrorHandler.recordRetryAttempt(errorInfo);

        // Wait for retry delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // The actual retry logic should be handled by the calling code
        // This hook just manages the state and feedback

      } catch (retryError) {
        console.error('Auto-retry failed:', retryError);
      } finally {
        setState(prev => ({ ...prev, isRecovering: false }));
      }
    }

    // Enable fallback mode for certain error types
    if (type === 'suggestion_api_unavailable' || type === 'suggestion_recalculation_failed') {
      enableFallbackMode();
    }

    return errorInfo;
  }, [showError]);

  /**
   * Handle successful operations with positive feedback
   */
  const handleSuccess = useCallback((
    type: SuccessNotificationType,
    customMessage?: string,
    options?: { showToast?: boolean; duration?: number }
  ) => {
    const notification = editorFeedbackService.showSuccess(type, customMessage);

    // Show toast notification if enabled (default: true)
    if (options?.showToast !== false) {
      const toastMessage = editorFeedbackService.toToastMessage(notification);
      showSuccess(toastMessage.message, options?.duration || toastMessage.duration);
    }

    return notification;
  }, [showSuccess]);

  /**
   * Execute a recovery action for the current error
   */
  const executeRecoveryAction = useCallback(async (actionType: string): Promise<void> => {
    if (!state.currentError) {
      throw new Error('No current error to recover from');
    }

    setState(prev => ({ ...prev, isRecovering: true }));

    try {
      // Get the recovery action configuration
      const recoveryActions = editorFeedbackService.createRecoveryActions(state.currentError);
      const actionConfig = recoveryActions.find(action => action.type === actionType);

      if (!actionConfig) {
        throw new Error(`Unknown recovery action: ${actionType}`);
      }

      // Execute the recovery action
      await actionConfig.handler();

      // Show success feedback
      handleSuccess('error_recovery_success', `Recovery action "${actionConfig.label}" completed successfully`);

      // Clear the current error
      clearCurrentError();

    } catch (recoveryError) {
      console.error(`Recovery action ${actionType} failed:`, recoveryError);

      // Handle recovery failure
      await handleError(
        recoveryError instanceof Error ? recoveryError : String(recoveryError),
        'unknown_error',
        { originalError: state.currentError, failedRecoveryAction: actionType }
      );
    } finally {
      setState(prev => ({ ...prev, isRecovering: false }));
    }
  }, [state.currentError, handleSuccess, handleError]);

  /**
   * Clear the current error
   */
  const clearCurrentError = useCallback(() => {
    setState(prev => ({ ...prev, currentError: null }));
  }, []);

  /**
   * Enable fallback mode
   */
  const enableFallbackMode = useCallback(() => {
    editorErrorHandler.enableFallbackMode();
    setState(prev => ({ ...prev, fallbackModeActive: true }));

    showWarning('Fallback mode enabled - some features may be limited', 5000);

    handleSuccess('fallback_mode_enabled', 'Basic editing mode is now active');
  }, [showWarning, handleSuccess]);

  /**
   * Disable fallback mode
   */
  const disableFallbackMode = useCallback(() => {
    editorErrorHandler.disableFallbackMode();
    setState(prev => ({ ...prev, fallbackModeActive: false }));

    handleSuccess('fallback_mode_disabled', 'Full functionality has been restored');
  }, [handleSuccess]);

  /**
   * Clear all error history
   */
  const clearErrorHistory = useCallback(() => {
    editorErrorHandler.clearErrorHistory();
    setState(prev => ({
      ...prev,
      errorHistory: [],
      currentError: null,
    }));
  }, []);

  /**
   * Register a custom recovery handler
   */
  const registerRecoveryHandler = useCallback((
    action: string,
    handler: () => Promise<void> | void
  ) => {
    editorFeedbackService.registerRecoveryHandler(action as any, handler);
  }, []);

  /**
   * Check if a specific error type has occurred recently
   */
  const hasRecentError = useCallback((
    type: EditorErrorType,
    withinMinutes: number = 5
  ): boolean => {
    const cutoffTime = Date.now() - (withinMinutes * 60 * 1000);
    return state.errorHistory.some(error =>
      error.type === type && error.timestamp > cutoffTime
    );
  }, [state.errorHistory]);

  /**
   * Get error statistics
   */
  const getErrorStats = useCallback(() => {
    const stats = {
      totalErrors: state.errorHistory.length,
      errorsByType: {} as Record<EditorErrorType, number>,
      errorsBySeverity: {} as Record<string, number>,
      recentErrors: 0,
    };

    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    state.errorHistory.forEach(error => {
      // Count by type
      stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;

      // Count by severity
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;

      // Count recent errors
      if (error.timestamp > oneHourAgo) {
        stats.recentErrors++;
      }
    });

    return stats;
  }, [state.errorHistory]);

  return {
    // State
    currentError: state.currentError,
    errorHistory: state.errorHistory,
    isRecovering: state.isRecovering,
    fallbackModeActive: state.fallbackModeActive,

    // Error handling
    handleError,
    handleSuccess,
    clearCurrentError,
    clearErrorHistory,

    // Recovery actions
    executeRecoveryAction,
    registerRecoveryHandler,

    // Fallback mode
    enableFallbackMode,
    disableFallbackMode,

    // Utilities
    hasRecentError,
    getErrorStats,
  };
}

/**
 * Hook for handling mode transition errors specifically
 */
export function useModeTransitionErrorHandling() {
  const errorHandling = useEditorErrorHandling();

  const handleModeTransitionError = useCallback(async (
    error: Error | string,
    _fromMode: 'edit' | 'review',
    toMode: 'edit' | 'review',
    context?: Record<string, any>
  ) => {
    return errorHandling.handleError(
      error,
      'mode_switch_failed',
      {
        toMode,
        ...context,
      }
    );
  }, [errorHandling]);

  const handleSuggestionRecalculationError = useCallback(async (
    error: Error | string,
    context?: Record<string, any>
  ) => {
    return errorHandling.handleError(
      error,
      'suggestion_recalculation_failed',
      context
    );
  }, [errorHandling]);

  const handleSuggestionApiError = useCallback(async (
    error: Error | string,
    context?: Record<string, any>
  ) => {
    return errorHandling.handleError(
      error,
      'suggestion_api_unavailable',
      context
    );
  }, [errorHandling]);

  const handleModeTransitionSuccess = useCallback((
    _fromMode: 'edit' | 'review',
    toMode: 'edit' | 'review',
    suggestionsUpdated?: boolean
  ) => {
    const message = suggestionsUpdated
      ? `Switched to ${toMode} mode with updated suggestions`
      : `Switched to ${toMode} mode`;

    return errorHandling.handleSuccess('mode_switch_success', message);
  }, [errorHandling]);

  return {
    ...errorHandling,
    handleModeTransitionError,
    handleSuggestionRecalculationError,
    handleSuggestionApiError,
    handleModeTransitionSuccess,
  };
}
