import { useEffect, useState } from 'react';
import type { SuccessNotification } from '../../services/EditorFeedbackService';

interface SuccessNotificationProps {
  notification: SuccessNotification;
  onDismiss: () => void;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

export const SuccessNotificationComponent = ({
  notification,
  onDismiss,
  className = '',
  position = 'top-right',
}: SuccessNotificationProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-dismiss after duration
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  // Handle dismiss with animation
  const handleDismiss = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss();
    }, 300); // Animation duration
  };

  // Handle action button click
  const handleActionClick = () => {
    if (notification.actionHandler) {
      notification.actionHandler();
    }
    handleDismiss();
  };

  // Get position classes
  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  // Get animation classes
  const getAnimationClasses = () => {
    const baseClasses = 'transition-all duration-300 ease-in-out';

    if (!isVisible || isAnimating) {
      switch (position) {
        case 'top-right':
        case 'bottom-right':
          return `${baseClasses} transform translate-x-full opacity-0`;
        case 'top-left':
        case 'bottom-left':
          return `${baseClasses} transform -translate-x-full opacity-0`;
        case 'center':
          return `${baseClasses} transform -translate-x-1/2 -translate-y-1/2 scale-95 opacity-0`;
        default:
          return `${baseClasses} transform translate-x-full opacity-0`;
      }
    }

    return `${baseClasses} transform translate-x-0 opacity-100`;
  };

  // Get success icon
  const getSuccessIcon = () => {
    if (!notification.showIcon) return null;

    return (
      <div className="flex-shrink-0">
        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <div
      className={`fixed z-50 max-w-sm w-full ${getPositionClasses()} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className={`bg-white rounded-lg shadow-lg border border-green-200 p-4 ${getAnimationClasses()}`}>
        <div className="flex items-start space-x-3">
          {getSuccessIcon()}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {notification.message}
            </p>

            {/* Action button */}
            {notification.actionLabel && notification.actionHandler && (
              <div className="mt-2">
                <button
                  onClick={handleActionClick}
                  className="text-sm text-green-600 hover:text-green-700 font-medium focus:outline-none focus:underline"
                >
                  {notification.actionLabel}
                </button>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <div className="flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="inline-flex p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 rounded transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar for timed notifications */}
        {notification.duration && notification.duration > 0 && (
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full transition-all ease-linear"
              style={{
                width: '100%',
                animation: `shrink ${notification.duration}ms linear forwards`,
              }}
            />
          </div>
        )}
      </div>

      {/* CSS for progress bar animation */}
      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Inline success indicator for compact display
 */
interface SuccessIndicatorProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
  autoHide?: boolean;
  duration?: number;
}

export const SuccessIndicator = ({
  message,
  onDismiss,
  className = '',
  autoHide = true,
  duration = 3000,
}: SuccessIndicatorProps) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          onDismiss();
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoHide, duration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className={`inline-flex items-center px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm text-green-800 transition-all duration-300 ${className}`}
      role="status"
      aria-live="polite"
    >
      <svg className="w-4 h-4 mr-2 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>

      <span className="flex-1">{message}</span>

      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="ml-2 p-1 text-green-400 hover:text-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 rounded transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
};
