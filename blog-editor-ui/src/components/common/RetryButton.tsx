import { useState } from 'react';
import { ButtonLoading } from './LoadingState';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  maxRetries?: number;
  retryCount?: number;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Button component with built-in retry logic and loading states
 */
export const RetryButton = ({
  onRetry,
  disabled = false,
  className = '',
  children = 'Try Again',
  maxRetries = 3,
  retryCount = 0,
  variant = 'primary',
  size = 'md'
}: RetryButtonProps) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (disabled || isRetrying || retryCount >= maxRetries) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  const variantClasses = {
    primary: 'text-white bg-primary hover:bg-primary-hover focus:ring-primary disabled:bg-primary/50',
    secondary: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-primary disabled:bg-gray-100',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300'
  };

  const isDisabled = disabled || isRetrying || retryCount >= maxRetries;

  return (
    <button
      onClick={handleRetry}
      disabled={isDisabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {isRetrying ? (
        <ButtonLoading message="Retrying..." />
      ) : (
        <>
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {children}
          {maxRetries > 1 && retryCount > 0 && (
            <span className="ml-1 text-xs opacity-75">
              ({retryCount}/{maxRetries})
            </span>
          )}
        </>
      )}
    </button>
  );
};

/**
 * Retry mechanism with exponential backoff
 */
export const useRetryMechanism = (maxRetries = 3, baseDelay = 1000) => {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = async (operation: () => Promise<void>) => {
    if (retryCount >= maxRetries) {
      throw new Error(`Maximum retry attempts (${maxRetries}) exceeded`);
    }

    setIsRetrying(true);

    try {
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, retryCount);

      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      await operation();

      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      setRetryCount(prev => prev + 1);
      throw error;
    } finally {
      setIsRetrying(false);
    }
  };

  const reset = () => {
    setRetryCount(0);
    setIsRetrying(false);
  };

  return {
    retry,
    reset,
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries
  };
};
