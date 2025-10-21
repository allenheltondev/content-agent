import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useEditorMode } from '../../contexts/EditorModeContext';
import { useTransitionManager } from '../../hooks/useTransitionManager';
import { useHighContrastMode } from '../../hooks/useHighContrastMode';
import { useAccessibilityAnnouncements } from '../../hooks/useAccessibilityAnnouncements';
import type { EditorMode } from '../../contexts/EditorModeContext';

interface ModeToggleButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  disabled?: boolean;
  showProgressIndicator?: boolean;
}

const ModeToggleButtonComponent = ({
  className = '',
  size = 'md',
  showTooltip = true,
  disabled = false,
  showProgressIndicator = true,
}: ModeToggleButtonProps) => {
  const {
    currentMode,
    isTransitioning,
    pendingRecalculation,
    switchToEditMode,
    switchToReviewMode,
    hasContentChanges,
  } = useEditorMode();

  const {
    lastTransitionError,
    showRetryButton,
    retry,
    dismissError,
    progressMessage,
    progressPercentage,
    fallbackModeActive,
    enableFallback,
    executeRecoveryAction,
  } = useTransitionManager();

  const { getModeHighContrastClasses, isHighContrast } = useHighContrastMode();
  const { announce } = useAccessibilityAnnouncements();

  const [showTooltipState, setShowTooltipState] = useState(false);

  // Memoized mode toggle handler to prevent unnecessary re-renders
  const handleToggle = useCallback(async () => {
    if (disabled || isTransitioning) return;

    // Clear any previous errors
    if (lastTransitionError) {
      dismissError();
    }

    try {
      if (currentMode === 'edit') {
        await switchToReviewMode();
      } else {
        await switchToEditMode();
      }
    } catch (error) {
      console.error('Failed to switch mode:', error);
      // Error handling is now managed by the transition manager
    }
  }, [disabled, isTransitioning, lastTransitionError, dismissError, currentMode, switchToReviewMode, switchToEditMode]);

  // Memoized keyboard handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  // Memoized size classes to prevent object recreation
  const sizeClasses = useMemo(() => ({
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }), []);

  // Memoized mode-specific styling with high contrast support
  const getModeClasses = useCallback((mode: EditorMode) => {
    const isActive = currentMode === mode;
    const baseClasses = 'font-medium transition-all duration-200 ease-in-out';
    const highContrastClasses = getModeHighContrastClasses(mode, isActive);

    if (isActive) {
      const activeClasses = mode === 'edit'
        ? 'bg-blue-600 text-white shadow-md'
        : 'bg-green-600 text-white shadow-md';
      return `${baseClasses} ${activeClasses} ${highContrastClasses}`;
    }

    const inactiveClasses = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
    return `${baseClasses} ${inactiveClasses} ${highContrastClasses}`;
  }, [currentMode, getModeHighContrastClasses]);

  // Memoized tooltip content with accessibility information
  const tooltipContent = useMemo(() => {
    if (lastTransitionError) {
      return 'Transition failed - click to retry or dismiss error';
    }

    if (isTransitioning && progressMessage) {
      return progressMessage;
    }

    const keyboardHint = ' (Ctrl+M or Cmd+M)';
    const contentChangesHint = hasContentChanges() ? ' - Content changes detected' : '';

    if (currentMode === 'edit') {
      return `Switch to Review mode to see suggestions and feedback${keyboardHint}${contentChangesHint}`;
    }
    return `Switch to Edit mode to modify your content${keyboardHint}`;
  }, [lastTransitionError, isTransitioning, progressMessage, hasContentChanges, currentMode]);

  // Memoized ARIA label for current state
  const getAriaLabel = useCallback((mode: EditorMode) => {
    const isActive = currentMode === mode;
    const modeLabel = mode === 'edit' ? 'Edit' : 'Review';
    const stateLabel = isActive ? 'active' : 'inactive';
    const actionLabel = isActive ? 'currently active' : `switch to ${modeLabel} mode`;

    return `${modeLabel} mode, ${stateLabel}. ${actionLabel}`;
  }, [currentMode]);

  // Memoized current mode description for screen readers
  const currentModeDescription = useMemo(() => {
    if (currentMode === 'edit') {
      return 'Currently in Edit mode. Content editing is enabled, suggestions are hidden.';
    }
    return 'Currently in Review mode. Content editing is disabled, suggestions are visible.';
  }, [currentMode]);

  // Memoized loading state
  const isLoading = useMemo(() => isTransitioning || pendingRecalculation, [isTransitioning, pendingRecalculation]);

  // Announce mode changes to screen readers
  useEffect(() => {
    if (!isTransitioning && !lastTransitionError) {
      // Small delay to ensure the mode change is complete
      const timer = setTimeout(() => {
        announce(currentModeDescription);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentMode, isTransitioning, lastTransitionError, announce, currentModeDescription]);

  return (
    <div className="relative inline-flex">
      {/* Screen reader only current mode announcement */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {currentModeDescription}
      </div>

      {/* Toggle Button Container */}
      <div
        className={`
          inline-flex rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden
          ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isHighContrast ? 'border-2 border-gray-900' : ''}
          ${className}
        `}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => setShowTooltipState(false)}
        role="group"
        aria-label="Editor mode toggle"
      >
        {/* Edit Mode Button */}
        <button
          type="button"
          onClick={() => currentMode !== 'edit' && handleToggle()}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          className={`
            ${sizeClasses[size]}
            ${getModeClasses('edit')}
            border-r border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            disabled:cursor-not-allowed
            ${isHighContrast ? 'focus:ring-4 focus:ring-blue-900' : ''}
          `}
          aria-pressed={currentMode === 'edit'}
          aria-label={getAriaLabel('edit')}
          aria-describedby="mode-toggle-description"
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span>Edit</span>
          </div>
        </button>

        {/* Review Mode Button */}
        <button
          type="button"
          onClick={() => currentMode !== 'review' && handleToggle()}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          className={`
            ${sizeClasses[size]}
            ${getModeClasses('review')}
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
            disabled:cursor-not-allowed
            ${isHighContrast ? 'focus:ring-4 focus:ring-green-900' : ''}
          `}
          aria-pressed={currentMode === 'review'}
          aria-label={getAriaLabel('review')}
          aria-describedby="mode-toggle-description"
        >
          <div className="flex items-center space-x-2">
            {isLoading && currentMode === 'review' ? (
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
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
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
            <span>Review</span>
          </div>
        </button>
      </div>

      {/* Hidden description for screen readers */}
      <div id="mode-toggle-description" className="sr-only">
        Use this toggle to switch between Edit mode for content modification and Review mode for viewing suggestions.
        Keyboard shortcut: Ctrl+M or Cmd+M on Mac.
      </div>

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <div
          className={`
            absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap z-50
            ${isHighContrast ? 'border-2 border-white bg-black' : ''}
          `}
          role="tooltip"
          aria-hidden="true"
        >
          {tooltipContent}
          <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${isHighContrast ? 'border-t-black' : 'border-t-gray-900'}`} />
        </div>
      )}

      {/* Status indicators */}
      {showProgressIndicator && (
        <>
          {/* Error indicator */}
          {lastTransitionError && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
            </div>
          )}

          {/* Loading indicator for recalculation */}
          {pendingRecalculation && !lastTransitionError && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          )}

          {/* Transition progress indicator */}
          {isTransitioning && !lastTransitionError && !pendingRecalculation && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          )}
        </>
      )}

      {/* Progress bar for transitions */}
      {isTransitioning && showProgressIndicator && progressPercentage > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Enhanced error recovery panel */}
      {lastTransitionError && showRetryButton && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-sm z-10">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-red-800">Transition Failed</p>
                <p className="text-xs text-red-600 mt-1">{lastTransitionError}</p>
              </div>
              <button
                onClick={dismissError}
                className="ml-2 p-1 text-red-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                aria-label="Dismiss error"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                onClick={retry}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Try Again
              </button>

              {!fallbackModeActive && (
                <button
                  onClick={enableFallback}
                  className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  Basic Mode
                </button>
              )}

              <button
                onClick={() => executeRecoveryAction('skip_suggestions')}
                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Continue
              </button>
            </div>

            {fallbackModeActive && (
              <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                Basic mode active - limited functionality
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
// Memoized component to prevent unnecessary re-renders
export const ModeToggleButton = memo(ModeToggleButtonComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.className === nextProps.className &&
    prevProps.size === nextProps.size &&
    prevProps.showTooltip === nextProps.showTooltip &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.showProgressIndicator === nextProps.showProgressIndicator
  );
});

ModeToggleButton.displayName = 'ModeToggleButton';
