import { type ReactNode } from 'react';
import { requiresReauth, isRetryableError, getErrorMessage } from '../../utils/apiErrorHandler';
import { ARIA_LABELS, screenReader } from '../../utils/accessibility';
import type { ApiError } from '../../types';

interface ProfileErrorDisplayProps {
  error: Error | ApiError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  onAuthRequired?: () => void;
  context?: 'setup' | 'edit' | 'load' | 'save';
  variant?: 'banner' | 'card' | 'inline';
  showRetryCount?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

export const ProfileErrorDisplay = ({
  error,
  onRetry,
  onDismiss,
  onAuthRequired,
  context = 'load',
  variant = 'banner',
  showRetryCount = false,
  retryCount = 0,
  maxRetries = 3
}: ProfileErrorDisplayProps) => {
  if (!error) return null;

  const needsAuth = requiresReauth(error);
  const canRetry = isRetryableError(error) && onRetry && retryCount < maxRetries;
  const errorMessage = getErrorMessage(error);

  const getContextualMessage = (): string => {
    switch (context) {
      case 'setup':
        return `Profile setup failed: ${errorMessage}`;
      case 'edit':
        return `Failed to update profile: ${errorMessage}`;
      case 'save':
        return `Failed to save changes: ${errorMessage}`;
      case 'load':
        return `Failed to load profile: ${errorMessage}`;
      default:
        return errorMessage;
    }
  };

  const getIcon = (): ReactNode => {
    if (needsAuth) {
      return (
        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }

    return (
      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  const getBgColor = (): string => {
    if (needsAuth) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  const getTextColor = (): string => {
    if (needsAuth) return 'text-yellow-800';
    return 'text-red-800';
  };

  const getButtonColor = (): string => {
    if (needsAuth) return 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-300';
    return 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300';
  };

  const content = (
    <div className={`border rounded-lg p-4 ${getBgColor()}`} role="alert" aria-live="assertive">
      <div className="flex items-start">
        <div className="flex-shrink-0" aria-hidden="true">
          {getIcon()}
        </div>

        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${getTextColor()}`}>
            {needsAuth ? 'Authentication Required' : 'Error'}
          </h3>
          <p className={`mt-1 text-sm ${getTextColor()}`}>
            {getContextualMessage()}
          </p>

          {showRetryCount && retryCount > 0 && (
            <p className={`mt-1 text-xs ${getTextColor()} opacity-75`}>
              Retry attempt {retryCount} of {maxRetries}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {needsAuth && onAuthRequired && (
              <button
                onClick={onAuthRequired}
                aria-label="Sign in again to continue"
                className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded transition-colors min-h-touch ${getButtonColor()}`}
              >
                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign In Again
              </button>
            )}

            {canRetry && (
              <button
                onClick={onRetry}
                aria-label={`Retry operation (attempt ${retryCount + 1} of ${maxRetries})`}
                className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded transition-colors min-h-touch ${getButtonColor()}`}
              >
                <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>
            )}

            {onDismiss && (
              <button
                onClick={onDismiss}
                aria-label="Dismiss error message"
                className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded transition-colors min-h-touch ${getButtonColor()}`}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {onDismiss && (
          <div className="ml-auto pl-3">
            <button
              onClick={onDismiss}
              aria-label="Dismiss error message"
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-touch min-w-touch ${
                needsAuth
                  ? 'text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600'
                  : 'text-red-500 hover:bg-red-100 focus:ring-red-600'
              }`}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  switch (variant) {
    case 'card':
      return <div className="mb-6">{content}</div>;
    case 'inline':
      return <div className="mb-4">{content}</div>;
    case 'banner':
    default:
      return content;
  }
};
