import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon, PencilIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { SuggestionActionFeedback as SuggestionActionFeedbackType } from './SuggestionActionButtons';

/**
 * Props for SuggestionActionFeedback component
 */
export interface SuggestionActionFeedbackProps {
  feedback: SuggestionActionFeedbackType | null;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Get icon and styling for feedback type
 */
const getFeedbackDisplay = (type: SuggestionActionFeedbackType['type']) => {
  switch (type) {
    case 'accepted':
      return {
        icon: CheckCircleIcon,
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        textColor: 'text-green-800',
        iconColor: 'text-green-600'
      };
    case 'rejected':
      return {
        icon: XCircleIcon,
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        textColor: 'text-red-800',
        iconColor: 'text-red-600'
      };
    case 'edited':
      return {
        icon: PencilIcon,
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-800',
        iconColor: 'text-blue-600'
      };
    case 'error':
      return {
        icon: ExclamationTriangleIcon,
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        textColor: 'text-orange-800',
        iconColor: 'text-orange-600'
      };
    default:
      return {
        icon: CheckCircleIcon,
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        textColor: 'text-gray-800',
        iconColor: 'text-gray-600'
      };
  }
};

/**
 * SuggestionActionFeedback component displays feedback for suggestion actions
 */
export const SuggestionActionFeedback: React.FC<SuggestionActionFeedbackProps> = ({
  feedback,
  onDismiss,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Handle feedback visibility and auto-dismiss
  useEffect(() => {
    if (feedback) {
      setIsVisible(true);
      setIsExiting(false);

      // Auto-dismiss after duration
      const duration = feedback.duration || 3000;
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsExiting(false);
    }
  }, [feedback]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 200); // Animation duration
  };

  if (!feedback || !isVisible) {
    return null;
  }

  const display = getFeedbackDisplay(feedback.type);
  const Icon = display.icon;

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-200 ease-in-out
        ${isExiting
          ? 'translate-x-full opacity-0'
          : 'translate-x-0 opacity-100'
        }
        ${className}
      `}
    >
      <div
        className={`
          rounded-lg border shadow-lg p-4
          ${display.bgColor} ${display.borderColor}
        `}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${display.iconColor}`} />
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm font-medium ${display.textColor}`}>
              {feedback.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              type="button"
              onClick={handleDismiss}
              className={`
                rounded-md inline-flex text-sm
                ${display.textColor} hover:opacity-75
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white
              `}
            >
              <span className="sr-only">Dismiss</span>
              <XCircleIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

SuggestionActionFeedback.displayName = 'SuggestionActionFeedback';
