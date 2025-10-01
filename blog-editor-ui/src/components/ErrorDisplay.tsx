import React from 'react';
import type { AuthError, ErrorRecoveryStrategy } from '../types';

interface ErrorDisplayProps {
  error: AuthError | null;
  strategy?: ErrorRecoveryStrategy | null;
  onRetry?: () => void;
  onResend?: () => void;
  onRedirectToLogin?: () => void;
  className?: string;
}

/**
 * Component for displaying authentication errors with recovery options
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  strategy,
  onRetry,
  onResend,
  onRedirectToLogin,
  className = ''
}) => {
  if (!error) return null;

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return '🌐';
      case 'validation':
        return '⚠️';
      case 'cognito':
        return '🔐';
      default:
        return '❌';
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'network':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'validation':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'cognito':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const renderActionButton = () => {
    if (!strategy) return null;

    switch (strategy.action) {
      case 'retry-operation':
        return (
          <button
            onClick={onRetry}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!onRetry}
          >
            Try Again
          </button>
        );

      case 'retry-confirmation':
        return (
          <div className="mt-2 space-x-2">
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!onRetry}
            >
              Try Again
            </button>
            {strategy.showResendOption && (
              <button
                onClick={onResend}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={!onResend}
              >
                Resend Code
              </button>
            )}
          </div>
        );

      case 'redirect-to-login':
        return (
          <button
            onClick={onRedirectToLogin}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={!onRedirectToLogin}
          >
            Go to Login
          </button>
        );

      case 'auto-resend':
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">
              A new confirmation code has been sent to your email.
            </p>
            {strategy.showResendOption && (
              <button
                onClick={onResend}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                disabled={!onResend}
              >
                Resend Code
              </button>
            )}
          </div>
        );

      case 'contact-support':
        return (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-2">
              If this problem persists, please contact support.
            </p>
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!onRetry}
            >
              Try Again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getErrorColor()} ${className}`}>
      <div className="flex items-start">
        <span className="text-lg mr-2" role="img" aria-label="Error icon">
          {getErrorIcon()}
        </span>
        <div className="flex-1">
          <p className="font-medium">{error.message}</p>

          {error.code && (
            <p className="text-sm opacity-75 mt-1">
              Error Code: {error.code}
            </p>
          )}

          {strategy?.retryDelay && strategy.retryDelay > 0 && (
            <p className="text-sm opacity-75 mt-1">
              Please wait {Math.ceil(strategy.retryDelay / 1000)} seconds before trying again.
            </p>
          )}

          {renderActionButton()}
        </div>
      </div>
    </div>
  );
};
