import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAuthErrorHandler } from '../hooks/useAuthErrorHandler';
import { ErrorDisplay } from '../components/ErrorDisplay';
import type { AuthError, ErrorRecoveryStrategy } from '../types';

/**
 * Example component demonstrating enhanced authentication error handling
 */
export const EnhancedAuthExample: React.FC = () => {
  const auth = useAuth();
  const errorHandler = useAuthErrorHandler();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [currentError, setCurrentError] = useState<AuthError | null>(null);
  const [currentStrategy, setCurrentStrategy] = useState<ErrorRecoveryStrategy | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearError = () => {
    setCurrentError(null);
    setCurrentStrategy(null);
  };

  const handleLogin = async () => {
    if (!email || !password) return;

    setIsSubmitting(true);
    clearError();

    try {
      await auth.login(email, password);
    } catch (error) {
      const authError = errorHandler.processError(error, 'login');
      const strategy = errorHandler.getRecoveryStrategy(authError);

      setCurrentError(authError);
      setCurrentStrategy(strategy);

      console.log('Login error processed:', { authError, strategy });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) return;

    setIsSubmitting(true);
    clearError();

    try {
      const result = await auth.register(email, password, email);
      console.log('Registration successful:', result);
    } catch (error) {
      const result = await errorHandler.handleErrorWithRecovery(error, 'register', {
        autoResend: true,
        email
      });

      setCurrentError(result.error);
      setCurrentStrategy(result.strategy);

      if (result.autoResendAttempted) {
        console.log('Confirmation code was automatically resent');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmation = async () => {
    if (!email || !confirmationCode) return;

    setIsSubmitting(true);
    clearError();

    try {
      await auth.confirmRegistration(email, confirmationCode);
    } catch (error) {
      const result = await errorHandler.handleErrorWithRecovery(error, 'confirmRegistration', {
        autoResend: true,
        email
      });

      setCurrentError(result.error);
      setCurrentStrategy(result.strategy);

      if (result.autoResendAttempted) {
        console.log('New confirmation code sent due to expiration');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) return;

    setIsSubmitting(true);
    clearError();

    try {
      await auth.resendConfirmationCode(email);
      console.log('Confirmation code resent successfully');
    } catch (error) {
      const authError = errorHandler.processError(error, 'resendConfirmationCode');
      const strategy = errorHandler.getRecoveryStrategy(authError);

      setCurrentError(authError);
      setCurrentStrategy(strategy);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    clearError();
    // The user can now retry the operation
  };

  const handleRedirectToLogin = () => {
    clearError();
    auth.resetAuthFlow();
    // Reset form or redirect to login mode
  };

  // Create retry function with exponential backoff for network errors
  const retryWithBackoff = errorHandler.createRetryFunction(
    () => auth.login(email, password),
    3, // max retries
    1000 // base delay
  );

  const handleRetryWithBackoff = async () => {
    if (!currentError || !errorHandler.canRetry(currentError)) return;

    setIsSubmitting(true);
    clearError();

    try {
      await retryWithBackoff();
    } catch (error) {
      const authError = errorHandler.processError(error, 'login-retry');
      const strategy = errorHandler.getRecoveryStrategy(authError);

      setCurrentError(authError);
      setCurrentStrategy(strategy);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">Enhanced Auth Example</h2>

      {/* Error Display */}
      <ErrorDisplay
        error={currentError}
        strategy={currentStrategy}
        onRetry={handleRetry}
        onResend={handleResendCode}
        onRedirectToLogin={handleRedirectToLogin}
        className="mb-4"
      />

      {/* Email Input */}
      <div className="mb-4">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
      </div>

      {/* Password Input */}
      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
      </div>

      {/* Confirmation Code Input (shown when in confirming state) */}
      {auth.authFlowState === 'confirming' && (
        <div className="mb-4">
          <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700 mb-2">
            Confirmation Code
          </label>
          <input
            id="confirmationCode"
            type="text"
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSubmitting}
            maxLength={6}
            placeholder="Enter 6-digit code"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {auth.authFlowState === 'confirming' ? (
          <>
            <button
              onClick={handleConfirmation}
              disabled={isSubmitting || !email || !confirmationCode}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Registration'}
            </button>
            <button
              onClick={handleResendCode}
              disabled={isSubmitting || !email}
              className="w-full py-2 px-4 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Resend Code'}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleLogin}
              disabled={isSubmitting || !email || !password}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
            <button
              onClick={handleRegister}
              disabled={isSubmitting || !email || !password}
              className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </>
        )}

        {/* Retry with backoff button for network errors */}
        {currentError && errorHandler.canRetry(currentError) && (
          <button
            onClick={handleRetryWithBackoff}
            disabled={isSubmitting}
            className="w-full py-2 px-4 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
          >
            {isSubmitting ? 'Retrying...' : 'Retry with Smart Backoff'}
          </button>
        )}
      </div>

      {/* Debug Information */}
      <div className="mt-6 p-4 bg-gray-100 rounded-md">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Debug Info:</h3>
        <p className="text-xs text-gray-600">Auth Flow State: {auth.authFlowState}</p>
        <p className="text-xs text-gray-600">Pending Email: {auth.pendingEmail || 'None'}</p>
        <p className="text-xs text-gray-600">Is Loading: {auth.isLoading ? 'Yes' : 'No'}</p>
        <p className="text-xs text-gray-600">Is Authenticated: {auth.isAuthenticated ? 'Yes' : 'No'}</p>
        {currentError && (
          <>
            <p className="text-xs text-gray-600">Error Type: {currentError.type}</p>
            <p className="text-xs text-gray-600">Error Code: {currentError.code || 'None'}</p>
            <p className="text-xs text-gray-600">Retryable: {currentError.retryable ? 'Yes' : 'No'}</p>
          </>
        )}
      </div>
    </div>
  );
};
