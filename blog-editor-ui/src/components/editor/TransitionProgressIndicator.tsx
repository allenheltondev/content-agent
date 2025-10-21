import React from 'react';
import { useTransitionProgressDisplay, useTransitionErrorHandler } from '../../hooks/useTransitionManager';

/**
 * Props for TransitionProgressIndicator component
 */
export interface TransitionProgressIndicatorProps {
  className?: string;
  showDetails?: boolean;
  position?: 'top' | 'bottom' | 'inline';
}

/**
 * Component that displays transition progress with visual feedback
 */
export const TransitionProgressIndicator: React.FC<TransitionProgressIndicatorProps> = ({
  className = '',
  showDetails = true,
  position = 'top'
}) => {
  const {
    shouldShow,
    progressBarClass,
    progressIcon,
    progress,
    message,
    phase,
    canCancel
  } = useTransitionProgressDisplay();

  const {
    hasError,
    errorMessage,
    canRetry,
    retry,
    dismiss
  } = useTransitionErrorHandler();

  // Don't render if no transition is active and no error
  if (!shouldShow && !hasError) {
    return null;
  }

  const positionClasses = {
    top: 'fixed top-0 left-0 right-0 z-50',
    bottom: 'fixed bottom-0 left-0 right-0 z-50',
    inline: 'relative'
  };

  const baseClasses = `
    ${positionClasses[position]}
    bg-white border-b border-gray-200 shadow-sm
    transition-all duration-300 ease-in-out
    ${className}
  `;

  // Error display
  if (hasError && errorMessage) {
    return (
      <div className={`${baseClasses} bg-red-50 border-red-200`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-red-500 text-lg">❌</span>
              <div>
                <p className="text-sm font-medium text-red-800">
                  Transition Failed
                </p>
                {showDetails && (
                  <p className="text-sm text-red-600 mt-1">
                    {errorMessage}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canRetry && (
                <button
                  onClick={retry}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              )}
              <button
                onClick={dismiss}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Progress display
  if (shouldShow) {
    return (
      <div className={baseClasses}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              <span className="text-lg animate-pulse">
                {progressIcon}
              </span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-800">
                    {message}
                  </p>
                  {showDetails && (
                    <span className="text-xs text-gray-500">
                      {Math.round(progress)}%
                    </span>
                  )}
                </div>
                {showDetails && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${progressBarClass}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            {canCancel && (
              <button
                className="ml-4 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                onClick={() => {
                  // Cancel functionality would be implemented here
                  console.log('Cancel transition requested');
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Compact version of the progress indicator for inline use
 */
export const CompactTransitionIndicator: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { shouldShow, progressIcon, message, progress } = useTransitionProgressDisplay();
  const { hasError, errorMessage } = useTransitionErrorHandler();

  if (!shouldShow && !hasError) {
    return null;
  }

  if (hasError) {
    return (
      <div className={`flex items-center space-x-2 text-red-600 ${className}`}>
        <span>❌</span>
        <span className="text-sm">Failed</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 text-gray-600 ${className}`}>
      <span className="animate-pulse">{progressIcon}</span>
      <span className="text-sm">{message}</span>
      <div className="w-16 bg-gray-200 rounded-full h-1">
        <div
          className="h-1 bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Toast-style notification for transition status
 */
export const TransitionToast: React.FC<{
  onClose?: () => void;
}> = ({ onClose }) => {
  const { shouldShow, progressIcon, message, phase } = useTransitionProgressDisplay();
  const { hasError, errorMessage, canRetry, retry, dismiss } = useTransitionErrorHandler();

  // Auto-dismiss successful transitions
  React.useEffect(() => {
    if (phase === 'completing' && !hasError) {
      const timer = setTimeout(() => {
        onClose?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, hasError, onClose]);

  if (!shouldShow && !hasError) {
    return null;
  }

  const isError = hasError && errorMessage;
  const bgColor = isError ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200';
  const textColor = isError ? 'text-red-800' : 'text-blue-800';

  return (
    <div className={`
      fixed top-4 right-4 z-50 max-w-sm
      ${bgColor} border rounded-lg shadow-lg p-4
      transform transition-all duration-300 ease-in-out
    `}>
      <div className="flex items-start space-x-3">
        <span className={`text-lg ${isError ? '' : 'animate-pulse'}`}>
          {isError ? '❌' : progressIcon}
        </span>
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>
            {isError ? 'Transition Failed' : message}
          </p>
          {isError && errorMessage && (
            <p className="text-sm text-red-600 mt-1">
              {errorMessage}
            </p>
          )}
        </div>
        <div className="flex flex-col space-y-1">
          {isError && canRetry && (
            <button
              onClick={retry}
              className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          )}
          <button
            onClick={isError ? dismiss : onClose}
            className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {isError ? 'Dismiss' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
