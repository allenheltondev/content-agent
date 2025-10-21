import { useState } from 'react';
import { EditorModeProvider } from '../contexts/EditorModeContext';
import { ModeToggleButton } from '../components/editor/ModeToggleButton';
import { ErrorRecoveryPanel } from '../components/editor/ErrorRecoveryPanel';
import { SuccessNotificationComponent } from '../components/editor/SuccessNotification';
import { FallbackModeIndicator, CompactFallbackIndicator } from '../components/editor/FallbackModeIndicator';
import { EditorErrorBoundary } from '../components/editor/EditorErrorBoundary';
import { useEditorErrorHandling } from '../hooks/useEditorErrorHandling';
import { editorErrorHandler } from '../services/ErrorHandler';
import type { Suggestion } from '../types';

/**
 * Example component demonstrating comprehensive error handling integration
 */
export const ErrorHandlingIntegrationExample = () => {
  const [suggestions] = useState<Suggestion[]>([]);
  const [showSuccessDemo, setShowSuccessDemo] = useState(false);

  const {
    currentError,
    handleError,
    handleSuccess,
    executeRecoveryAction,
    clearCurrentError,
    fallbackModeActive,
    enableFallbackMode,
    disableFallbackMode,
  } = useEditorErrorHandling();

  // Demo functions to trigger different error scenarios
  const triggerModeTransitionError = async () => {
    await handleError(
      new Error('Network connection failed during mode transition'),
      'mode_switch_failed',
      { fromMode: 'edit', toMode: 'review' }
    );
  };

  const triggerSuggestionError = async () => {
    await handleError(
      new Error('Suggestion API is temporarily unavailable'),
      'suggestion_api_unavailable',
      { postId: 'demo-post', attemptedOperation: 'recalculation' }
    );
  };

  const triggerNetworkError = async () => {
    await handleError(
      new Error('Failed to fetch: network error'),
      'network_error',
      { endpoint: '/api/suggestions', method: 'POST' }
    );
  };

  const triggerSuccessNotification = () => {
    handleSuccess('mode_switch_success', 'Successfully switched to Review mode with updated suggestions');
    setShowSuccessDemo(true);
    setTimeout(() => setShowSuccessDemo(false), 4000);
  };

  const mockSuggestionRecalculation = async (content: string, currentSuggestions: Suggestion[]) => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate potential failure
    if (Math.random() < 0.3) {
      throw new Error('Suggestion recalculation failed - service temporarily unavailable');
    }

    return currentSuggestions;
  };

  return (
    <EditorErrorBoundary enableRecovery={true}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Error Handling Integration Demo
          </h1>

          <p className="text-gray-600 mb-6">
            This demo shows how the comprehensive error handling system works with the editor mode toggle.
          </p>

          {/* Fallback mode indicators */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Fallback Mode Status</h2>
              <CompactFallbackIndicator />
            </div>

            <FallbackModeIndicator
              onRetryConnection={async () => {
                // Simulate connection retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                console.log('Connection retry completed');
              }}
            />
          </div>

          {/* Editor Mode Provider Demo */}
          <div className="mb-6 p-4 border border-gray-200 rounded-lg">
            <h3 className="text-md font-semibold mb-3">Editor Mode Toggle with Error Handling</h3>

            <EditorModeProvider
              onSuggestionRecalculation={mockSuggestionRecalculation}
              currentSuggestions={suggestions}
              postId="demo-post"
            >
              <div className="flex items-center space-x-4">
                <ModeToggleButton />
                <span className="text-sm text-gray-600">
                  Try switching modes to see error handling in action
                </span>
              </div>
            </EditorModeProvider>
          </div>

          {/* Error Trigger Buttons */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-3">Trigger Error Scenarios</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={triggerModeTransitionError}
                className="px-3 py-2 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
              >
                Mode Switch Error
              </button>

              <button
                onClick={triggerSuggestionError}
                className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors"
              >
                Suggestion API Error
              </button>

              <button
                onClick={triggerNetworkError}
                className="px-3 py-2 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 transition-colors"
              >
                Network Error
              </button>

              <button
                onClick={triggerSuccessNotification}
                className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
              >
                Success Demo
              </button>
            </div>
          </div>

          {/* Fallback Mode Controls */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-3">Fallback Mode Controls</h3>
            <div className="flex space-x-3">
              <button
                onClick={enableFallbackMode}
                disabled={fallbackModeActive}
                className="px-3 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Enable Fallback Mode
              </button>

              <button
                onClick={disableFallbackMode}
                disabled={!fallbackModeActive}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Disable Fallback Mode
              </button>
            </div>
          </div>

          {/* Current Error Display */}
          {currentError && (
            <div className="mb-6">
              <h3 className="text-md font-semibold mb-3">Current Error</h3>
              <ErrorRecoveryPanel
                error={currentError}
                onRecoveryAction={executeRecoveryAction}
                onDismiss={clearCurrentError}
                showTechnicalDetails={true}
              />
            </div>
          )}

          {/* Success Notification Demo */}
          {showSuccessDemo && (
            <SuccessNotificationComponent
              notification={{
                type: 'mode_switch_success',
                message: 'Successfully switched to Review mode with updated suggestions',
                duration: 4000,
                showIcon: true,
                actionLabel: 'View Details',
                actionHandler: () => console.log('Success action clicked'),
              }}
              onDismiss={() => setShowSuccessDemo(false)}
              position="top-right"
            />
          )}

          {/* Error Statistics */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold mb-3">Error Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Total Errors:</span>
                <span className="ml-2">{editorErrorHandler.getErrorHistory().length}</span>
              </div>
              <div>
                <span className="font-medium">Fallback Active:</span>
                <span className="ml-2">{fallbackModeActive ? 'Yes' : 'No'}</span>
              </div>
              <div>
                <span className="font-medium">Current Error:</span>
                <span className="ml-2">{currentError ? currentError.type : 'None'}</span>
              </div>
              <div>
                <button
                  onClick={() => editorErrorHandler.clearErrorHistory()}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  Clear History
                </button>
              </div>
            </div>
          </div>

          {/* Integration Notes */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-md font-semibold text-blue-900 mb-2">Integration Notes</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Error handling is automatically integrated with the EditorModeProvider</li>
              <li>• Toast notifications are shown for all errors and successes</li>
              <li>• Recovery actions are context-aware and provide appropriate options</li>
              <li>• Fallback mode enables degraded functionality when services are unavailable</li>
              <li>• All components are accessible with proper ARIA labels and keyboard navigation</li>
            </ul>
          </div>
        </div>
      </div>
    </EditorErrorBoundary>
  );
};

/**
 * Component that demonstrates error boundary behavior
 */
const ErrorBoundaryDemo = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('This is a demo error to test the error boundary');
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="text-md font-semibold mb-3">Error Boundary Demo</h3>
      <p className="text-sm text-gray-600 mb-3">
        Click the button below to trigger an error and see how the error boundary handles it.
      </p>
      <button
        onClick={() => setShouldThrow(true)}
        className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Trigger Error Boundary
      </button>
    </div>
  );
};

/**
 * Complete demo with error boundary
 */
export const CompleteErrorHandlingDemo = () => {
  return (
    <EditorErrorBoundary enableRecovery={true}>
      <div className="space-y-6">
        <ErrorHandlingIntegrationExample />
        <ErrorBoundaryDemo />
      </div>
    </EditorErrorBoundary>
  );
};
