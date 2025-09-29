import { useState, useEffect } from 'react';
import type { SuggestionUndoAction } from '../../hooks/useSuggestionManager';

interface UndoNotificationProps {
  undoAction: SuggestionUndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
  autoHideDelay?: number;
}

/**
 * UndoNotification component shows a temporary notification
 * when a suggestion is accepted, allowing users to undo the action
 */
export const UndoNotification = ({
  undoAction,
  onUndo,
  onDismiss,
  autoHideDelay = 8000 // 8 seconds
}: UndoNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(autoHideDelay / 1000);

  // Show/hide animation
  useEffect(() => {
    if (undoAction) {
      setIsVisible(true);
      setTimeLeft(autoHideDelay / 1000);
    } else {
      setIsVisible(false);
    }
  }, [undoAction, autoHideDelay]);

  // Auto-hide timer
  useEffect(() => {
    if (!undoAction || !isVisible) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [undoAction, isVisible, onDismiss]);

  // Handle undo click
  const handleUndo = () => {
    onUndo();
    setIsVisible(false);
  };

  // Handle dismiss
  const handleDismiss = () => {
    onDismiss();
    setIsVisible(false);
  };

  if (!undoAction || !isVisible) {
    return null;
  }

  const getSuggestionTypeColor = (type: string) => {
    const colorMap = {
      llm: 'text-blue-600',
      brand: 'text-purple-600',
      fact: 'text-orange-600',
      grammar: 'text-green-600',
      spelling: 'text-red-600'
    };
    return colorMap[type as keyof typeof colorMap] || 'text-gray-600';
  };

  const getSuggestionTypeName = (type: string) => {
    const nameMap = {
      llm: 'AI Suggestion',
      brand: 'Brand Guidelines',
      fact: 'Fact Check',
      grammar: 'Grammar',
      spelling: 'Spelling'
    };
    return nameMap[type as keyof typeof nameMap] || type;
  };

  return (
    <div className={`
      fixed bottom-6 right-6 z-50 max-w-md
      transform transition-all duration-300 ease-in-out
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
    `}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-900">
              Suggestion Applied
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Suggestion details */}
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`text-xs font-medium ${getSuggestionTypeColor(undoAction.suggestion.type)}`}>
              {getSuggestionTypeName(undoAction.suggestion.type)}
            </span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-xs text-gray-500 capitalize">
              {undoAction.suggestion.priority} priority
            </span>
          </div>

          <div className="text-sm text-gray-700">
            <span className="line-through text-gray-500">"{undoAction.suggestion.textToReplace}"</span>
            <span className="mx-2">→</span>
            <span className="font-medium">"{undoAction.suggestion.replaceWith}"</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleUndo}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo
          </button>

          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Auto-dismiss in {timeLeft}s</span>
            <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                style={{
                  width: `${(timeLeft / (autoHideDelay / 1000)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
