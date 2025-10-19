import React, { useEffect, useCallback } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * Navigation context for suggestion navigation
 */
export interface SuggestionNavigationContext {
  currentIndex: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Props for SuggestionNavigationControls component
 */
export interface SuggestionNavigationControlsProps {
  navigationContext: SuggestionNavigationContext;
  onNavigate: (direction: 'previous' | 'next') => void;
  isProcessing?: boolean;
  showKeyboardHints?: boolean;
  className?: string;
}

/**
 * SuggestionNavigationControls component provides previous/next navigation with keyboard support
 */
export const SuggestionNavigationControls: React.FC<SuggestionNavigationControlsProps> = ({
  navigationContext,
  onNavigate,
  isProcessing = false,
  showKeyboardHints = true,
  className = ''
}) => {
  const { currentIndex, totalCount, hasNext, hasPrevious } = navigationContext;

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle if not processing and not in an input field
    if (isProcessing ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (hasPrevious) {
          onNavigate('previous');
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (hasNext) {
          onNavigate('next');
        }
        break;
      default:
        break;
    }
  }, [isProcessing, hasPrevious, hasNext, onNavigate]);

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle button clicks
  const handlePreviousClick = useCallback(() => {
    if (hasPrevious && !isProcessing) {
      onNavigate('previous');
    }
  }, [hasPrevious, isProcessing, onNavigate]);

  const handleNextClick = useCallback(() => {
    if (hasNext && !isProcessing) {
      onNavigate('next');
    }
  }, [hasNext, isProcessing, onNavigate]);

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Previous button */}
      <button
        type="button"
        disabled={!hasPrevious || isProcessing}
        onClick={handlePreviousClick}
        className={`
          inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          ${hasPrevious && !isProcessing
            ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-blue-500'
            : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
          }
        `}
        title={showKeyboardHints ? 'Previous suggestion (← Arrow key)' : 'Previous suggestion'}
        aria-label="Navigate to previous suggestion"
      >
        <ChevronLeftIcon className="w-4 h-4 mr-1" />
        Previous
      </button>

      {/* Position indicator */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600 font-medium">
          {currentIndex + 1} of {totalCount}
        </span>

        {/* Progress bar */}
        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{
              width: totalCount > 0 ? `${((currentIndex + 1) / totalCount) * 100}%` : '0%'
            }}
          />
        </div>
      </div>

      {/* Next button */}
      <button
        type="button"
        disabled={!hasNext || isProcessing}
        onClick={handleNextClick}
        className={`
          inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border
          transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
          ${hasNext && !isProcessing
            ? 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:ring-blue-500'
            : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
          }
        `}
        title={showKeyboardHints ? 'Next suggestion (→ Arrow key)' : 'Next suggestion'}
        aria-label="Navigate to next suggestion"
      >
        Next
        <ChevronRightIcon className="w-4 h-4 ml-1" />
      </button>

      {/* Keyboard hints */}
      {showKeyboardHints && (
        <div className="hidden sm:flex items-center text-xs text-gray-500 ml-4">
          <span className="inline-flex items-center space-x-1">
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
              ←
            </kbd>
            <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 border border-gray-300 rounded">
              →
            </kbd>
            <span className="ml-1">to navigate</span>
          </span>
        </div>
      )}
    </div>
  );
};

SuggestionNavigationControls.displayName = 'SuggestionNavigationControls';
