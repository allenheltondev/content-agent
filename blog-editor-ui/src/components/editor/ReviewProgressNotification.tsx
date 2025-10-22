import React, { useState, useEffect } from 'react';
import { AnimatedProgress } from '../common/AnimatedProgress';
import { getProgressMessages, getTimeBasedMessage } from '../../utils/reviewProgressMessages';

interface ReviewProgressNotificationProps {
  isVisible: boolean;
  onDismiss?: () => void;
}

export const ReviewProgressNotification: React.FC<ReviewProgressNotificationProps> = ({
  isVisible,
  onDismiss
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Track elapsed time when notification becomes visible
  useEffect(() => {
    if (isVisible && !startTime) {
      setStartTime(Date.now());
      setElapsedSeconds(0);
    } else if (!isVisible) {
      setStartTime(null);
      setElapsedSeconds(0);
    }
  }, [isVisible, startTime]);

  // Update elapsed time every second
  useEffect(() => {
    if (!isVisible || !startTime) return;

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isVisible, startTime]);

  if (!isVisible) return null;

  const progressMessages = getProgressMessages(elapsedSeconds);
  const timeMessage = getTimeBasedMessage(elapsedSeconds);

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-white border border-blue-200 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900 mb-2">
              Review in Progress
            </h4>

            <AnimatedProgress
              messages={progressMessages}
              interval={2500}
              className="mb-3"
            />

            <p className="text-xs text-gray-500">
              Stay on this page to see suggestions as they arrive. {timeMessage}
            </p>

            {elapsedSeconds > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Elapsed: {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
              </p>
            )}
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
