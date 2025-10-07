import React from 'react';
import { AuthPersistenceTest } from '../components/debug/AuthPersistenceTest';

/**
 * Debug page for testing authentication persistence functionality
 * This page is only for development and testing purposes
 */
export const DebugPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Authentication Debug Page
          </h1>
          <p className="text-gray-600">
            This page is for testing authentication persistence functionality.
            Use this to verify that authentication state persists across page refreshes.
          </p>
        </div>

        <AuthPersistenceTest />

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="font-medium mb-2 text-blue-800">How Authentication Persistence Works</h2>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              <strong>1. Token Storage:</strong> When you log in, your authentication tokens are stored in localStorage
              along with user information and expiration times.
            </p>
            <p>
              <strong>2. Page Load Check:</strong> When the app loads, it first checks localStorage for existing
              authentication state before showing the login page.
            </p>
            <p>
              <strong>3. Token Validation:</strong> Stored tokens are validated against Cognito to ensure they're
              still valid and not expired.
            </p>
            <p>
              <strong>4. Automatic Refresh:</strong> Tokens are automatically refreshed every 45 minutes to prevent
              expiration, and also when the tab becomes visible again.
            </p>
            <p>
              <strong>5. Error Recovery:</strong> If token refresh fails due to network issues, the system will
              retry with exponential backoff and graceful degradation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
