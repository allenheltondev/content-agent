import { useState, useCallback } from 'react';
import type { EditorError, RecoveryActionConfig } from '../../services/EditorErrorHandler';
import { editorFeedbackService } from '../../services/EditorFeedbackService';

interface ErrorRecoveryPanelProps {
  error: EditorError;
  onRecoveryAction: (action: string) => Promise<void>;
  onDismiss: () => void;
  className?: string;
  showTechnicalDetails?: boolean;
}

export const ErrorRecoveryPanel = ({
  error,
  onRecoveryAction,
  onDismiss,
  className = '',
  showTechnicalDetails = false,
}: ErrorRecoveryPanelProps) => {
  const [isExecutingAction, setIsExecutingAction] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Get recovery actions for this error
  const recoveryActions = editorFeedbackService.createRecoveryActions(error);

  // Handle recovery action execution
  const handleRecoveryAction = useCallback(async (actionConfig: RecoveryActionConfig) => {
    if (isExecutingAction) return;

    try {
      setIsExecutingAction(actionConfig.type);

      // Execute the action handler
      await actionConfig.handler();

      // Execute the callback
      await onRecoveryAction(actionConfig.type);

      // Show success feedback
      editorFeedbackService.showSuccess('error_recovery_success');

    } catch (actionError) {
      console.error(`Recovery action ${actionConfig.type} failed:`, actionError);
      // The parent component should handle this error
    } finally {
      setIsExecutingAction(null);
    }
  }, [isExecutingAction, onRecoveryAction]);

  // Get error icon based on severity
  const getErrorIcon = () => {
    switch (error.severity) {
      case 'low':
        return (
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'high':
      case 'critical':
      default:
        return (
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Get panel styling based on severity
  const getPanelStyling = () => {
    const baseClasses = "rounded-lg border p-4 shadow-sm";

    switch (error.severity) {
      case 'low':
        return `${baseClasses} bg-yellow-50 border-yellow-200`;
      case 'medium':
        return `${baseClasses} bg-orange-50 border-orange-200`;
      case 'high':
      case 'critical':
      default:
        return `${baseClasses} bg-red-50 border-red-200`;
    }
  };

  // Get button styling for recovery actions
  const getActionButtonStyling = (actionConfig: RecoveryActionConfig, isExecuting: boolean) => {
    const baseClasses = "px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    if (isExecuting) {
      return `${baseClasses} bg-gray-300 text-gray-500 cursor-not-allowed`;
    }

    if (actionConfig.primary) {
      return `${baseClasses} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`;
    }

    return `${baseClasses} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500`;
  };

  return (
    <div className={`${getPanelStyling()} ${className}`} role="alert" aria-live="polite">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getErrorIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900">
              {error.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {error.userMessage}
            </p>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="flex-shrink-0 ml-3 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-label="Dismiss error"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* Recovery Actions */}
      {recoveryActions.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {recoveryActions.map((actionConfig) => {
              const isExecuting = isExecutingAction === actionConfig.type;

              return (
                <button
                  key={actionConfig.type}
                  onClick={() => handleRecoveryAction(actionConfig)}
                  disabled={!!isExecutingAction}
                  className={getActionButtonStyling(actionConfig, isExecuting)}
                  title={actionConfig.description}
                >
                  {isExecuting && (
                    <svg className="w-4 h-4 mr-2 animate-spin inline" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {actionConfig.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Technical Details (if enabled) */}
      {showTechnicalDetails && error.technicalDetails && (
        <div className="mt-4">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline"
          >
            {showDetails ? 'Hide' : 'Show'} technical details
          </button>

          {showDetails && (
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
              <pre className="whitespace-pre-wrap break-words">
                {error.technicalDetails}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Context Information (if available) */}
      {error.context && Object.keys(error.context).length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          <details>
            <summary className="cursor-pointer hover:text-gray-700">
              Error context
            </summary>
            <div className="mt-1 pl-4">
              {Object.entries(error.context).map(([key, value]) => (
                <div key={key} className="flex">
                  <span className="font-medium">{key}:</span>
                  <span className="ml-1">{String(value)}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-3 text-xs text-gray-400">
        {new Date(error.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

/**
 * Compact error indicator for inline display
 */
interface ErrorIndicatorProps {
  error: EditorError;
  onClick: () => void;
  className?: string;
}

export const ErrorIndicator = ({ error, onClick, className = '' }: ErrorIndicatorProps) => {
  const getIndicatorColor = () => {
    switch (error.severity) {
      case 'low':
        return 'text-yellow-500 hover:text-yellow-600';
      case 'medium':
        return 'text-orange-500 hover:text-orange-600';
      case 'high':
      case 'critical':
      default:
        return 'text-red-500 hover:text-red-600';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${getIndicatorColor()} ${className}`}
      title={error.userMessage}
      aria-label={`Error: ${error.userMessage}. Click for recovery options.`}
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    </button>
  );
};
