import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';

/**
 * Debug component to test authentication persistence functionality
 * This component helps verify that authentication state persists across page refreshes
 */
export const AuthPersistenceTest: React.FC = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    lastTokenRefresh,
    persistAuthState,
    restoreAuthState,
    clearPersistedAuthState
  } = useAuth();

  const [testResults, setTestResults] = useState<string[]>([]);
  const [persistedState, setPersistedState] = useState<any>(null);

  useEffect(() => {
    // Check for persisted state on component mount
    const restored = restoreAuthState();
    setPersistedState(restored);

    if (restored) {
      addTestResult('✅ Found persisted auth state on mount');
    } else {
      addTestResult('ℹ️ No persisted auth state found on mount');
    }
  }, []);

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testPersistence = () => {
    if (!user || !isAuthenticated) {
      addTestResult('❌ Cannot test persistence - user not authenticated');
      return;
    }

    try {
      // Create mock tokens for testing
      const mockTokens = {
        accessToken: { toString: () => 'test-access-token' },
        idToken: {
          toString: () => 'test-id-token',
          payload: { exp: Math.floor(Date.now() / 1000) + 3600 } // 1 hour from now
        },
        refreshToken: { toString: () => 'test-refresh-token' }
      };
    persistAuthState(user, mockTokens);
      addTestResult('✅ Successfully persisted auth state');

      // Verify it was stored
      const restored = restoreAuthState();
      if (restored) {
        addTestResult('✅ Successfully restored persisted auth state');
        setPersistedState(restored);
      } else {
        addTestResult('❌ Failed to restore persisted auth state');
      }
    } catch (error) {
      addTestResult(`❌ Persistence test failed: ${error}`);
    }
  };

  const testClearPersistence = () => {
    try {
      clearPersistedAuthState();
      addTestResult('✅ Successfully cleared persisted auth state');

      const restored = restoreAuthState();
      if (!restored) {
        addTestResult('✅ Confirmed persisted state was cleared');
        setPersistedState(null);
      } else {
        addTestResult('❌ Persisted state was not properly cleared');
      }
    } catch (error) {
      addTestResult(`❌ Clear persistence test failed: ${error}`);
    }
  };

  const simulatePageRefresh = () => {
    addTestResult('🔄 Simulating page refresh...');
    // In a real scenario, this would be a page refresh
    // For testing, we'll just re-check the persisted state
    setTimeout(() => {
      const restored = restoreAuthState();
      if (restored) {
        addTestResult('✅ Auth state would survive page refresh');
      } else {
        addTestResult('❌ Auth state would NOT survive page refresh');
      }
    }, 100);
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Loading authentication state...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4 text-gray-900">
        Authentication Persistence Test
      </h2>

      {/* Current Auth State */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Current Authentication State</h3>
        <div className="space-y-1 text-sm">
          <p><strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
          <p><strong>User:</strong> {user?.username || 'None'}</p>
          <p><strong>Email:</strong> {user?.attributes?.email || 'None'}</p>
          <p><strong>Last Token Refresh:</strong> {
            lastTokenRefresh
              ? new Date(lastTokenRefresh).toLocaleString()
              : 'Never'
          }</p>
        </div>
      </div>

      {/* Persisted State Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">Persisted State</h3>
        {persistedState ? (
          <div className="space-y-1 text-sm">
            <p><strong>User:</strong> {persistedState.user?.username}</p>
            <p><strong>Tokens:</strong> {persistedState.tokens ? 'Present' : 'Missing'}</p>
            <p><strong>Access Token:</strong> {persistedState.tokens?.accessToken ? 'Present' : 'Missing'}</p>
            <p><strong>Expires At:</strong> {
              persistedState.tokens?.expiresAt
                ? new Date(persistedState.tokens.expiresAt).toLocaleString()
                : 'Unknown'
            }</p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No persisted state found</p>
        )}
      </div>

      {/* Test Controls */}
      <div className="mb-6 space-x-2">
        <button
          onClick={testPersistence}
          disabled={!isAuthenticated}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Test Persistence
        </button>
        <button
          onClick={testClearPersistence}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear Persistence
        </button>
        <button
          onClick={simulatePageRefresh}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Simulate Refresh
        </button>
        <button
          onClick={clearTestResults}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Clear Results
        </button>
      </div>

      {/* Test Results */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium mb-2">Test Results</h3>
        {testResults.length === 0 ? (
          <p className="text-sm text-gray-600">No test results yet</p>
        ) : (
          <div className="space-y-1 text-sm font-mono">
            {testResults.map((result, index) => (
              <div key={index} className="text-gray-800">
                {result}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium mb-2 text-yellow-800">Testing Instructions</h3>
        <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
          <li>Make sure you're logged in first</li>
          <li>Click "Test Persistence" to save auth state to localStorage</li>
          <li>Refresh the page manually (Ctrl+R or F5)</li>
          <li>Check if you remain logged in after refresh</li>
          <li>Use "Clear Persistence" to test cleanup functionality</li>
        </ol>
      </div>
    </div>
  );
};
