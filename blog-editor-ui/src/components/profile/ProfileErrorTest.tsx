import { useState } from 'react';
import { ProfileErrorDisplay } from './ProfileErrorDisplay';
import { ProfileErrorBoundary } from './ProfileErrorBoundary';
import { ProfileOperationLoading } from './ProfileLoadingSpinner';
import type { ApiError } from '../../types';

/**
 * Test component to verify profile error handling functionality
 * This component is for development/testing purposes only
 */
export const ProfileErrorTest = () => {
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const simulateNetworkError = () => {
    const networkError: ApiError = {
      message: 'Network request failed',
      code: 'NETWORK_ERROR'
    };
    setError(networkError);
    setRetryCount(0);
  };

  const simulateAuthError = () => {
    const authError: ApiError = {
      message: 'Your session has expired',
      status: 401,
      code: '401'
    };
    setError(authError);
    setRetryCount(0);
  };

  const simulateServerError = () => {
    const serverError: ApiError = {
      message: 'Internal server error',
      status: 500,
      code: '500'
    };
    setError(serverError);
    setRetryCount(0);
  };

  const simulateValidationError = () => {
    const validationError: ApiError = {
      message: 'Invalid profile data provided',
      status: 400,
      code: '400'
    };
    setError(validationError);
    setRetryCount(0);
  };

  const simulateLoading = () => {
    setError(null);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    // Simulate retry logic
    setTimeout(() => {
      if (retryCount < 2) {
        // Fail again for first 2 retries
        simulateNetworkError();
      } else {
        // Success on 3rd retry
        setError(null);
      }
    }, 1000);
  };

  const handleDismiss = () => {
    setError(null);
    setRetryCount(0);
  };

  const handleAuthRequired = () => {
    alert('Auth required - would redirect to login');
  };

  if (isLoading) {
    return <ProfileOperationLoading operation="saving" variant="page" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-6">Profile Error Handling Test</h1>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <button
              onClick={simulateNetworkError}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Network Error
            </button>
            <button
              onClick={simulateAuthError}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Auth Error
            </button>
            <button
              onClick={simulateServerError}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Server Error
            </button>
            <button
              onClick={simulateValidationError}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Validation Error
            </button>
            <button
              onClick={simulateLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Loading State
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear Error
            </button>
          </div>

          {error && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Error Display Variants:</h2>

              <div>
                <h3 className="font-medium mb-2">Banner Variant (Setup Context):</h3>
                <ProfileErrorDisplay
                  error={error}
                  onRetry={handleRetry}
                  onDismiss={handleDismiss}
                  onAuthRequired={handleAuthRequired}
                  context="setup"
                  variant="banner"
                  showRetryCount={true}
                  retryCount={retryCount}
                  maxRetries={3}
                />
              </div>

              <div>
                <h3 className="font-medium mb-2">Card Variant (Edit Context):</h3>
                <ProfileErrorDisplay
                  error={error}
                  onRetry={handleRetry}
                  onDismiss={handleDismiss}
                  onAuthRequired={handleAuthRequired}
                  context="edit"
                  variant="card"
                  showRetryCount={true}
                  retryCount={retryCount}
                  maxRetries={3}
                />
              </div>

              <div>
                <h3 className="font-medium mb-2">Inline Variant (Save Context):</h3>
                <ProfileErrorDisplay
                  error={error}
                  onRetry={handleRetry}
                  onDismiss={handleDismiss}
                  onAuthRequired={handleAuthRequired}
                  context="save"
                  variant="inline"
                  showRetryCount={true}
                  retryCount={retryCount}
                  maxRetries={3}
                />
              </div>
            </div>
          )}

          {!error && !isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-600">No errors to display. Click a button above to test error handling.</p>
              <p className="text-sm text-gray-500 mt-2">
                Retry Count: {retryCount}
              </p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Error Boundary Test</h2>
          <p className="text-sm text-gray-600 mb-4">
            The error boundary will catch JavaScript errors thrown by child components.
          </p>

          <ProfileErrorBoundary context="setup" onAuthRequired={handleAuthRequired}>
            <TestErrorComponent />
          </ProfileErrorBoundary>
        </div>
      </div>
    </div>
  );
};

const TestErrorComponent = () => {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error thrown by component');
  }

  return (
    <div>
      <p className="mb-4">This component can throw an error to test the error boundary.</p>
      <button
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Throw Error
      </button>
    </div>
  );
};
