import { useCallback } from 'react';
import { useAuth } from './useAuth';
import type { AuthError, ErrorRecoveryStrategy } from '../types';
import { AuthErrorHandler } from '../utils/authErrorHandler';

/**
 * Custom hook for handling authentication errors with recovery strategies
 */
export const useAuthErrorHandler = () => {
  const auth = useAuth();

  /**
   * Process an authentication error and return structured error information
   */
  const processError = useCallback((error: unknown, operation: string): AuthError => {
    return auth.handleAuthError(error, operation);
  }, [auth]);

  /**
   * Check if an operation can be retried based on the error
   */
  const canRetry = useCallback((error: AuthError): boolean => {
    return auth.canRetryOperation(error);
  }, [auth]);

  /**
   * Get the suggested retry delay for rate-limited operations
   */
  const getRetryDelay = useCallback((error: AuthError): number => {
    return auth.getRetryDelay(error);
  }, [auth]);

  /**
   * Get recovery strategy for a specific error
   */
  const getRecoveryStrategy = useCallback((error: AuthError): ErrorRecoveryStrategy | null => {
    if (!error.code) return null;
    return AuthErrorHandler.getRecoveryStrategy(error.code);
  }, []);

  /**
   * Check if error should trigger automatic resend of confirmation code
   */
  const shouldAutoResend = useCallback((error: AuthError): boolean => {
    return AuthErrorHandler.shouldAutoResend(error);
  }, []);

  /**
   * Format error message for display
   */
  const formatErrorMessage = useCallback((error: AuthError, context?: string): string => {
    return AuthErrorHandler.formatErrorMessage(error, context);
  }, []);

  /**
   * Handle authentication error with automatic recovery actions
   */
  const handleErrorWithRecovery = useCallback(async (
    error: unknown,
    operation: string,
    options?: {
      autoResend?: boolean;
      email?: string;
    }
  ): Promise<{
    error: AuthError;
    strategy: ErrorRecoveryStrategy | null;
    autoResendAttempted?: boolean;
  }> => {
    const authError = processError(error, operation);
    const strategy = getRecoveryStrategy(authError);

    let autoResendAttempted = false;

    // Handle automatic resend for expired confirmation codes
    if (options?.autoResend && shouldAutoResend(authError) && options.email) {
      try {
        await auth.resendConfirmationCode(options.email);
        autoResendAttempted = true;
        console.log('Automatically resent confirmation code due to expiration');
      } catch (resendError) {
        console.error('Failed to automatically resend confirmation code:', resendError);
      }
    }

    return {
      error: authError,
      strategy,
      autoResendAttempted
    };
  }, [processError, getRecoveryStrategy, shouldAutoResend, auth]);

  /**
   * Create a retry function with exponential backoff
   */
  const createRetryFunction = useCallback(<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ) => {
    return async (): Promise<T> => {
      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error;

          const authError = processError(error, 'retry-operation');

          // Don't retry if error is not retryable
          if (!canRetry(authError)) {
            throw error;
          }

          // Don't retry on last attempt
          if (attempt === maxRetries) {
            throw error;
          }

          // Calculate delay with exponential backoff
          const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000); // Max 30 seconds
          const errorDelay = getRetryDelay(authError);
          const finalDelay = Math.max(delay, errorDelay);

          console.log(`Retrying operation in ${finalDelay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
          await new Promise(resolve => setTimeout(resolve, finalDelay));
        }
      }

      throw lastError;
    };
  }, [processError, canRetry, getRetryDelay]);

  return {
    processError,
    canRetry,
    getRetryDelay,
    getRecoveryStrategy,
    shouldAutoResend,
    formatErrorMessage,
    handleErrorWithRecovery,
    createRetryFunction
  };
};
