import { useCallback } from 'react';
import { useEditorErrorHandling } from '../../hooks/useEditorErrorHandling';

interface FallbackModeIndicatorProps {
  className?: string;
  showDetails?: boolean;
  onRetryConnection?: () => Promise<void>;
}

export const FallbackModeIndicator = ({
  className = '',
  showDetails = true,
  onRetryConnection,
}: FallbackModeIndicatorProps) => {
  const {
    fallbackModeActive,
    disableFallbackMode,
    handleSuccess,
  } = useEditorErrorHandling();

  const handleRetryConnection = useCallback(async () => {
    if (onRetryConnection) {
      try {
        await onRetryConnection();
        disableFallbackMode();
        handleSuccess('fallback_mode_disabled', 'Connection restored - full functionality available');
      } catch (error) {
        console.error('Failed to restore connection:', error);
        // Error will be handled by the calling component
      }
    }
  }, [onRetryConnection, disableFallbackMode, handleSuccess]);

  if (!fallbackModeActive) {
    return null;
  }

  return (
    <div
      className={`bg-yellow-50 border border-yellow-200 rounded-lg p-3 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start space-x-3">
        {/* Warning icon */}
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-yellow-800">
            Basic Mode Active
          </h3>

          {showDetails && (
            <div className="mt-1 text-sm text-yellow-700">
              <p>Some features are temporarily unavailable. You can:</p>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li>Continue editing your content normally</li>
                <li>Review existing suggestions</li>
                <li>Save your work</li>
              </ul>
              <p className="mt-2 text-xs">
                New suggestions and advanced features will be restored when the connection is available.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {onRetryConnection && (
              <button
                onClick={handleRetryConnection}
                className="inline-flex items-center px-3 py-1 text-xs font-medium bg-yellow-600 text-white rounded hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry Connection
              </button>
            )}

            <button
              onClick={disableFallbackMode}
              className="inline-flex items-center px-3 py-1 text-xs font-medium bg-white text-yellow-700 border border-yellow-300 rounded hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact fallback mode indicator for header/toolbar display
 */
interface CompactFallbackIndicatorProps {
  className?: string;
  onClick?: () => void;
}

export const CompactFallbackIndicator = ({
  className = '',
  onClick,
}: CompactFallbackIndicatorProps) => {
  const { fallbackModeActive } = useEditorErrorHandling();

  if (!fallbackModeActive) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 rounded hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-colors ${className}`}
      title="Basic mode active - click for details"
    >
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      Basic Mode
    </button>
  );
};
