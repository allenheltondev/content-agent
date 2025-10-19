import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { useProfileContext } from '../contexts/ProfileContext';
import { requiresReauth, isRetryableError, getErrorMessage } from '../utils/apiErrorHandler';
import type { ApiError } from '../types';

/**
 * Hook for handling profile-related errors with consistent UX patterns
 */
export const useProfileErrorHandling = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showError, showSuccess } = useToast();
  const { error, clearError, retryLastOperation, canRetry, retryCount } = useProfileContext();

  const handleAuthRequired = useCallback(async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (logoutError) {
      console.error('Logout failed:', logoutError);
      // Force redirect if logout fails
      window.location.href = '/login';
    }
  }, [logout, navigate]);

  const handleRetry = useCallback(async () => {
    if (!canRetry) {
      showError('Maximum retry attempts reached. Please refresh the page.');
      return;
    }

    try {
      await retryLastOperation();
      showSuccess('Operation completed successfully!');
    } catch (retryError) {
      console.error('Retry failed:', retryError);
      // Error will be handled by ProfileContext
    }
  }, [canRetry, retryLastOperation, showError, showSuccess]);

  const handleDismiss = useCallback(() => {
    clearError();
  }, [clearError]);

  const getErrorActions = useCallback((error: ApiError | Error | null) => {
    if (!error) return {};

    const needsAuth = requiresReauth(error);
    const isRetryable = isRetryableError(error);

    return {
      canRetry: isRetryable && canRetry,
      needsAuth,
      onRetry: isRetryable ? handleRetry : undefined,
      onAuthRequired: needsAuth ? handleAuthRequired : undefined,
      onDismiss: handleDismiss
    };
  }, [canRetry, handleRetry, handleAuthRequired, handleDismiss]);

  const showErrorToast = useCallback((error: ApiError | Error | null, context?: string) => {
    if (!error) return;

    const message = getErrorMessage(error);
    const contextualMessage = context ? `${context}: ${message}` : message;
    showError(contextualMessage);
  }, [showError]);

  return {
    // Current error state
    error,
    retryCount,
    canRetry,

    // Action handlers
    handleAuthRequired,
    handleRetry,
    handleDismiss,
    getErrorActions,

    // Utility functions
    showErrorToast,
    clearError,

    // Error checking utilities
    requiresReauth: (error: ApiError | Error | null) => error ? requiresReauth(error) : false,
    isRetryableError: (error: ApiError | Error | null) => error ? isRetryableError(error) : false,
    getErrorMessage: (error: ApiError | Error | null) => error ? getErrorMessage(error) : ''
  };
};
