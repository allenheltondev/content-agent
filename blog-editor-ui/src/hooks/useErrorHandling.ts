import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToastContext } from '../contexts/ToastContext';
import { getErrorMessage, isRetryableError, requiresReauth, logError } from '../utils/apiErrorHandler';
import { useAuth } from './useAuth';

interface ErrorHandlingOptions {
  showToast?: boolean;
  logError?: boolean;
  context?: string;
  onError?: (error: Error) => void;
  onRetryableError?: (error: Error) => void;
  onAuthError?: () => void;
}

interface ErrorState {
  error: Error | null;
  isRetryable: boolean;
  requiresAuth: boolean;
  retryCount: number;
}

/**
 * Comprehensive error handling hook with automatic toast notifications,
 * retry logic, and authentication handling
 */
export const useErrorHandling = (options: ErrorHandlingOptions = {}) => {
  const { showError, showWarning } = useToastContext();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetryable: false,
    requiresAuth: false,
    retryCount: 0
  });

  const handleError = useCallback((error: Error | string, customOptions?: Partial<ErrorHandlingOptions>) => {
    const mergedOptions = { ...options, ...customOptions };
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    // Log error if requested
    if (mergedOptions.logError !== false) {
      logError(errorObj, mergedOptions.context);
    }

    // Determine error characteristics
    const isRetryable = isRetryableError(errorObj);
    const needsAuth = requiresReauth(errorObj);

    // Update error state
    setErrorState(prev => ({
      error: errorObj,
      isRetryable,
      requiresAuth: needsAuth,
      retryCount: prev.error === errorObj ? prev.retryCount + 1 : 0
    }));

    // Show toast notification if requested
    if (mergedOptions.showToast !== false) {
      const message = getErrorMessage(errorObj);
      const displayMessage = mergedOptions.context ? `${mergedOptions.context}: ${message}` : message;

      if (needsAuth) {
        showWarning(`Authentication required: ${displayMessage}`);
      } else {
        showError(displayMessage);
      }
    }

    // Call appropriate callbacks
    mergedOptions.onError?.(errorObj);

    if (isRetryable) {
      mergedOptions.onRetryableError?.(errorObj);
    }

    if (needsAuth) {
      mergedOptions.onAuthError?.();
    }

    return {
      error: errorObj,
      isRetryable,
      requiresAuth: needsAuth,
      message: getErrorMessage(errorObj)
    };
  }, [options, showError, showWarning]);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isRetryable: false,
      requiresAuth: false,
      retryCount: 0
    });
  }, []);

  const handleAuthError = useCallback(async () => {
    try {
      // Clear user session and redirect to login
      await logout();
      navigate('/login');
      clearError();
    } catch (authError) {
      handleError(authError as Error, { context: 'Authentication failed' });
    }
  }, [logout, navigate, clearError, handleError]);

  const retry = useCallback(async (operation: () => Promise<void>, maxRetries = 3) => {
    if (errorState.retryCount >= maxRetries) {
      handleError(new Error(`Maximum retry attempts (${maxRetries}) exceeded`));
      return false;
    }

    try {
      clearError();
      await operation();
      return true;
    } catch (error) {
      handleError(error as Error);
      return false;
    }
  }, [errorState.retryCount, handleError, clearError]);

  return {
    // Error state
    error: errorState.error,
    isRetryable: errorState.isRetryable,
    requiresAuth: errorState.requiresAuth,
    retryCount: errorState.retryCount,
    hasError: !!errorState.error,

    // Error handling functions
    handleError,
    clearError,
    handleAuthError,
    retry,

    // Convenience functions
    handleApiError: (error: Error | string) => handleError(error, { context: 'API Error' }),
    handleNetworkError: (error: Error | string) => handleError(error, { context: 'Network Error' }),
    handleValidationError: (error: Error | string) => handleError(error, {
      context: 'Validation Error',
      showToast: true
    }),
  };
};

/**
 * Hook for handling async operations with comprehensive error handling
 */
export const useAsyncOperation = <T = any>(options: ErrorHandlingOptions = {}) => {
  const [loading, setLoading] = useState(false);
  const errorHandling = useErrorHandling(options);

  const execute = useCallback(async (
    operation: () => Promise<T>,
    operationOptions?: Partial<ErrorHandlingOptions>
  ): Promise<T | null> => {
    setLoading(true);
    errorHandling.clearError();

    try {
      const result = await operation();
      return result;
    } catch (error) {
      errorHandling.handleError(error as Error, operationOptions);
      return null;
    } finally {
      setLoading(false);
    }
  }, [errorHandling]);

  const executeWithRetry = useCallback(async (
    operation: () => Promise<T>,
    maxRetries = 3,
    operationOptions?: Partial<ErrorHandlingOptions>
  ): Promise<T | null> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await execute(operation, {
        ...operationOptions,
        showToast: false // Don't show toast during retries
      });

      if (result !== null) {
        return result;
      }

      // Store the last error for final failure handling
      lastError = errorHandling.error;

      // Don't retry if error is not retryable
      if (!errorHandling.isRetryable) {
        break;
      }

      // Wait before retry with exponential backoff
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        errorHandling.clearError(); // Clear error before retry
      }
    }

    // All retries exhausted - show final error
    if (lastError && (operationOptions?.showToast !== false)) {
      errorHandling.handleError(
        new Error(`Failed after ${maxRetries + 1} attempts: ${lastError.message}`),
        { ...operationOptions, showToast: true }
      );
    }

    return null;
  }, [execute, errorHandling]);

  return {
    loading,
    execute,
    executeWithRetry,
    ...errorHandling
  };
};
