import { useState, useEffect } from 'react';
import { XMarkIcon, DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline';

interface DraftData {
  title: string;
  content: string;
  timestamp: number;
}

interface DraftRecoveryNotificationProps {
  draftData: DraftData;
  isVisible: boolean;
  onRecover: (data: DraftData) => void;
  onDiscard: () => void;
  onDismiss: () => void;
}

export const DraftRecoveryNotification = ({
  draftData,
  isVisible,
  onRecover,
  onDiscard,
  onDismiss
}: DraftRecoveryNotificationProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle visibility changes with smooth transitions
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready for animation
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      // Wait for animation to complete before removing from DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    return date.toLocaleDateString();
  };

  const previewContent = (content: string, maxLength = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Don't render if not visible and animation is complete
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`
        bg-primary/10 border border-primary/30 rounded-lg p-4 mb-4
        transition-all duration-300 ease-in-out
        ${isAnimating
          ? 'opacity-100 transform translate-y-0'
          : 'opacity-0 transform -translate-y-2'
        }
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <DocumentTextIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-tertiary">Draft Found</h3>
              <div className="flex items-center text-xs text-primary">
                <ClockIcon className="h-3 w-3 mr-1" />
                {formatTimestamp(draftData.timestamp)}
              </div>
            </div>

            <p className="text-sm text-tertiary mb-3">
              We found unsaved changes from your previous editing session. Would you like to recover them?
            </p>

            {/* Preview */}
            <div className="bg-white border border-primary/30 rounded p-3 mb-3">
              {draftData.title && (
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-500 mb-1">Title:</div>
                  <div className="text-sm text-gray-900 font-medium">
                    {previewContent(draftData.title, 80)}
                  </div>
                </div>
              )}

              {draftData.content && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Content:</div>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {isExpanded ? draftData.content : previewContent(draftData.content, 150)}
                  </div>

                  {draftData.content.length > 150 && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs text-primary hover:text-primary-hover mt-1 transition-colors duration-200"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onRecover(draftData)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
              >
                Recover Draft
              </button>

              <button
                onClick={onDiscard}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
              >
                Discard
              </button>

              <button
                onClick={onDismiss}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-primary/60 hover:text-primary ml-4 transition-colors duration-200"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
