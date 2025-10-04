import { useState } from 'react';
import { LocalStorageManager, type NewPostDraft } from '../../utils/localStorage';

interface NewPostRecoveryNotificationProps {
  onRecover: (draft: NewPostDraft) => void;
  onDismiss: () => void;
  className?: string;
}

export const NewPostRecoveryNotification = ({
  onRecover,
  onDismiss,
  className = ''
}: NewPostRecoveryNotificationProps) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [draftData] = useState<NewPostDraft | null>(() =>
    LocalStorageManager.getNewPostDraft()
  );

  if (!draftData) return null;

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      onRecover(draftData);
    } finally {
      setIsRecovering(false);
    }
  };

  const handleDiscard = () => {
    LocalStorageManager.clearNewPostDraft();
    onDismiss();
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Less than an hour ago';
    }
  };

  const getContentSummary = () => {
    const titlePreview = draftData.title.trim()
      ? draftData.title.length > 50
        ? `${draftData.title.substring(0, 50)}...`
        : draftData.title
      : 'Untitled';

    const contentLength = draftData.content.trim().length;
    const wordCount = draftData.content.trim().split(/\s+/).filter(word => word.length > 0).length;

    return {
      titlePreview,
      contentLength,
      wordCount: contentLength > 0 ? wordCount : 0
    };
  };

  const { titlePreview, contentLength, wordCount } = getContentSummary();

  return (
    <div className={`bg-amber-50 border border-amber-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            Resume Draft Post?
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>
              We found an unsaved draft from {formatTimestamp(draftData.timestamp)}.
            </p>
            <div className="mt-2 p-3 bg-amber-100 rounded-md">
              <p className="font-medium text-amber-800 mb-1">"{titlePreview}"</p>
              <p className="text-xs text-amber-600">
                {wordCount > 0 ? `${wordCount} words` : 'No content'} • {contentLength} characters
              </p>
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="button"
              onClick={handleRecover}
              disabled={isRecovering}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRecovering ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Recovering...
                </>
              ) : (
                'Recover Draft'
              )}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isRecovering}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Fresh
            </button>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={onDismiss}
              disabled={isRecovering}
              className="inline-flex rounded-md p-1.5 text-amber-500 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 focus:ring-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
