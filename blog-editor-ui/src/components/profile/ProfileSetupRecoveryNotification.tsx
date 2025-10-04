import { useState } from 'react';
import { LocalStorageManager, type ProfileSetupDraft } from '../../utils/localStorage';

interface ProfileSetupRecoveryNotificationProps {
  onRecover: () => void;
  onDismiss: () => void;
  className?: string;
}

export const ProfileSetupRecoveryNotification = ({
  onRecover,
  onDismiss,
  className = ''
}: ProfileSetupRecoveryNotificationProps) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [draftData] = useState<ProfileSetupDraft | null>(() =>
    LocalStorageManager.getProfileSetupDraft()
  );

  if (!draftData) return null;

  const handleRecover = async () => {
    setIsRecovering(true);
    try {
      onRecover();
    } finally {
      setIsRecovering(false);
    }
  };

  const handleDiscard = () => {
    LocalStorageManager.clearProfileSetupDraft();
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

  const getProgressSummary = () => {
    const completedFields = [
      draftData.writingTone && 'writing tone',
      draftData.writingStyle && 'writing style',
      draftData.topics.length > 0 && `${draftData.topics.length} topic${draftData.topics.length > 1 ? 's' : ''}`,
      draftData.skillLevel !== 'beginner' && 'skill level'
    ].filter(Boolean);

    if (completedFields.length === 0) {
      return `Step ${draftData.currentStep} of 4`;
    }

    return `Step ${draftData.currentStep} of 4 • ${completedFields.join(', ')} completed`;
  };

  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Resume Profile Setup?
          </h3>
          <div className="mt-2 text-sm text-blue-700">
            <p>
              We found your previous profile setup progress from {formatTimestamp(draftData.timestamp)}.
            </p>
            <p className="mt-1 text-xs text-blue-600">
              {getProgressSummary()}
            </p>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="button"
              onClick={handleRecover}
              disabled={isRecovering}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                'Continue Setup'
              )}
            </button>
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isRecovering}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="inline-flex rounded-md p-1.5 text-blue-500 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-50 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
