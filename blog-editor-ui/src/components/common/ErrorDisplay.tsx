import { getErrorMessage, isRetryableError, requiresReauth } from '../../utils/apiErrorHandler';

interface ErrorDisplayProps {
  error: Error | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  onAuthRequired?: () => void;
  className?: string;
  variant?: 'inline' | 'banner' | 'card';
  showIcon?: boolean;
}

/**
 * Reusable error display component with appropriate actions
 */
export const ErrorDisplay = ({
  error,
  onRetry,
  onDismiss,
  onAuthRequired,
  className = '',
  variant = 'inline',
  showIcon = true
}: ErrorDisplayProps) => {
  if (!error) return null;

  const errorMessage = typeof error === 'string' ? error : getErrorMessage(error);
  const canRetry = typeof error !== 'string' && isRetryableError(error);
  const needsAuth = typeof error !== 'string' && requiresReauth(error);

  const baseClasses = {
    inline: 'bg-red-50 border border-red-200 rounded-md p-3',
    banner: 'bg-red-50 border-l-4 border-red-400 p-4',
    card: 'bg-red-50 border border-red-200 rounded-lg p-4 shadow-sm'
  };

  const iconClasses = {
    inline: 'h-4 w-4',
    banner: 'h-5 w-5',
    card: 'h-5 w-5'
  };

  return (
    <div className={`${baseClasses[variant]} ${className}`}>
      <div className="flex items-start">
        {showIcon && (
          <div className="flex-shrink-0">
            <svg
              className={`${iconClasses[variant]} text-red-400`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}

        <div className={`${showIcon ? 'ml-3' : ''} flex-1 min-w-0`}>
          <p className="text-sm font-medium text-red-800 break-words">
            {needsAuth ? 'Authentication Required' : 'Error'}
          </p>
          <p className="mt-1 text-sm text-red-700 break-words">
            {errorMessage}
          </p>

          {(canRetry || needsAuth || onDismiss) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {needsAuth && onAuthRequired && (
                <button
                  onClick={onAuthRequired}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign In Again
                </button>
              )}

              {canRetry && onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              )}

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>

        {onDismiss && !canRetry && !needsAuth && (
          <div className="ml-3 flex-shrink-0">
            <button
              onClick={onDismiss}
              className="inline-flex p-1 text-red-400 hover:text-red-600 focus:outline-none focus:text-red-600 transition-colors"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
