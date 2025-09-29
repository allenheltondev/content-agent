import { useState } from 'react';
import { XMarkIcon, DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline';

interface DraftData {
  title: string;
  content: string;
  timestamp: number;
}

interface DraftRecoveryNotificationProps {
  draftData: DraftData;
  onRecover: (data: DraftData) => void;
  onDiscard: () => void;
  onDismiss: () => void;
}

export const DraftRecoveryNotification = ({
  draftData,
  onRecover,
  onDiscard,
  onDismiss
}: DraftRecoveryNotificationProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

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

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <DocumentTextIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-blue-900">Draft Found</h3>
              <div className="flex items-center text-xs text-blue-600">
                <ClockIcon className="h-3 w-3 mr-1" />
                {formatTimestamp(draftData.timestamp)}
              </div>
            </div>

            <p className="text-sm text-blue-700 mb-3">
              We found unsaved changes from your previous editing session. Would you like to recover them?
            </p>

            {/* Preview */}
            <div className="bg-white border border-blue-200 rounded p-3 mb-3">
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
                      className="text-xs text-blue-600 hover:text-blue-800 mt-1"
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
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Recover Draft
              </button>

              <button
                onClick={onDiscard}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Discard
              </button>

              <button
                onClick={onDismiss}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="text-blue-400 hover:text-blue-600 ml-4"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
