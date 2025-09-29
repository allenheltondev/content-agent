import { useState } from 'react';
import { useAsyncOperation, useErrorHandling } from '../../hooks/useErrorHandling';
import { useToastContext } from '../../contexts/ToastContext';
import {
  AsyncErrorBoundary,
  ApiErrorBoundary,
  ErrorDisplay,
  LoadingState,
  RetryButton,
  ButtonLoading
} from '../common';

/**
 * Demo component showcasing all error handling and user feedback features
 * This demonstrates the comprehensive error handling system implementation
 */
export const ErrorHandlingDemo = () => {
  const [simulatedError, setSimulatedError] = useState<Error | null>(null);
  const { showSuccess, showError, showWarning, showInfo } = useToastContext();

  // Demo async operation with error handling
  const {
    loading: isLoading,
    error,
    execute,
    executeWithRetry,
    clearError,
    handleApiError,
    handleValidationError
  } = useAsyncOperation({
    context: 'Demo Operation',
    showToast: true
  });

  // Demo error handling hook
  const errorHandling = useErrorHandling({
    showToast: false, // We'll handle toasts manually for demo
    context: 'Manual Error Handling'
  });

  // Simulate different types of operations
  const simulateSuccess = async () => {
    await execute(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      showSuccess('Operation completed successfully!');
      return 'Success result';
    });
  };

  const simulateNetworkError = async () => {
    await executeWithRetry(async () => {
      throw new Error('Network request failed');
    }, 2);
  };

  const simulateAuthError = async () => {
    const authError = new Error('Authentication required') as any;
    authError.status = 401;
    handleApiError(authError);
  };

  const simulateValidationError = () => {
    handleValidationError('Invalid input: Title must be at least 5 characters long');
  };

  const simulateRetryableError = async () => {
    const retryableError = new Error('Service temporarily unavailable') as any;
    retryableError.status = 503;
    await execute(async () => {
      throw retryableError;
    });
  };

  const simulateComponentError = () => {
    const componentError = new Error('Component rendering failed');
    setSimulatedError(componentError);
  };

  const clearComponentError = () => {
    setSimulatedError(null);
  };

  // Component that throws an error for boundary testing
  const ErrorThrowingComponent = () => {
    if (simulatedError) {
      throw simulatedError;
    }
    return <div className="p-4 bg-green-50 rounded-lg">Component rendered successfully!</div>;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Error Handling & User Feedback Demo
        </h1>
        <p className="text-gray-600">
          Comprehensive demonstration of error handling, loading states, and user feedback systems
        </p>
      </div>

      {/* Toast Notifications Demo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Toast Notifications</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => showSuccess('Success message!')}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Success Toast
          </button>
          <button
            onClick={() => showError('Error message!')}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Error Toast
          </button>
          <button
            onClick={() => showWarning('Warning message!')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Warning Toast
          </button>
          <button
            onClick={() => showInfo('Info message!')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Info Toast
          </button>
        </div>
      </div>

      {/* Loading States Demo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Loading States</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-2">Spinner Loading</h3>
            <LoadingState message="Loading data..." size="md" />
          </div>
          <div>
            <h3 className="font-medium mb-2">Dots Loading</h3>
            <LoadingState message="Processing..." variant="dots" size="md" />
          </div>
          <div>
            <h3 className="font-medium mb-2">Pulse Loading</h3>
            <LoadingState message="Syncing..." variant="pulse" size="md" />
          </div>
          <div>
            <h3 className="font-medium mb-2">Skeleton Loading</h3>
            <LoadingState variant="skeleton" />
          </div>
        </div>
      </div>

      {/* Async Operations Demo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Async Operations with Error Handling</h2>

        {error && (
          <ErrorDisplay
            error={error}
            onDismiss={clearError}
            variant="banner"
            className="mb-4"
          />
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={simulateSuccess}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <ButtonLoading message="Loading..." /> : 'Simulate Success'}
          </button>

          <button
            onClick={simulateNetworkError}
            disabled={isLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <ButtonLoading message="Trying..." /> : 'Network Error'}
          </button>

          <button
            onClick={simulateAuthError}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
          >
            Auth Error
          </button>

          <button
            onClick={simulateValidationError}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Validation Error
          </button>

          <button
            onClick={simulateRetryableError}
            disabled={isLoading}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? <ButtonLoading message="Trying..." /> : 'Retryable Error'}
          </button>

          <RetryButton
            onRetry={simulateSuccess}
            disabled={isLoading}
            variant="secondary"
          >
            Retry Button
          </RetryButton>
        </div>
      </div>

      {/* Error Boundaries Demo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Error Boundaries</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Async Error Boundary</h3>
            <div className="flex gap-3 mb-3">
              <button
                onClick={simulateComponentError}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Trigger Component Error
              </button>
              <button
                onClick={clearComponentError}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Clear Error
              </button>
            </div>

            <AsyncErrorBoundary>
              <ErrorThrowingComponent />
            </AsyncErrorBoundary>
          </div>

          <div>
            <h3 className="font-medium mb-2">API Error Boundary</h3>
            <ApiErrorBoundary
              onAuthRequired={() => showInfo('Authentication required!')}
              onRetry={() => showInfo('Retrying operation...')}
            >
              <div className="p-4 bg-blue-50 rounded-lg">
                API operations are protected by this boundary
              </div>
            </ApiErrorBoundary>
          </div>
        </div>
      </div>

      {/* Error Display Variants */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Error Display Variants</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Inline Error</h3>
            <ErrorDisplay
              error="This is an inline error message"
              variant="inline"
              onDismiss={() => {}}
            />
          </div>

          <div>
            <h3 className="font-medium mb-2">Banner Error</h3>
            <ErrorDisplay
              error="This is a banner error message"
              variant="banner"
              onDismiss={() => {}}
            />
          </div>

          <div>
            <h3 className="font-medium mb-2">Card Error with Retry</h3>
            <ErrorDisplay
              error={new Error('Network connection failed') as any}
              variant="card"
              onRetry={() => showInfo('Retrying...')}
              onDismiss={() => {}}
            />
          </div>
        </div>
      </div>

      {/* Manual Error Handling Demo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Manual Error Handling</h2>

        {errorHandling.hasError && (
          <ErrorDisplay
            error={errorHandling.error!}
            onRetry={() => errorHandling.retry(async () => {
              showSuccess('Manual retry successful!');
            })}
            onDismiss={errorHandling.clearError}
            variant="banner"
            className="mb-4"
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={() => errorHandling.handleError(new Error('Manual error triggered'))}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Trigger Manual Error
          </button>

          <button
            onClick={() => errorHandling.handleApiError('API operation failed')}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
          >
            API Error
          </button>

          <button
            onClick={() => errorHandling.handleNetworkError('Network timeout')}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Network Error
          </button>
        </div>
      </div>
    </div>
  );
};
