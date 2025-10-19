import { Amplify } from 'aws-amplify';

// Build a storage adapter compatible with Amplify v6 using localStorage
const localStorageAdapter = typeof window !== 'undefined' && window.localStorage
  ? {
      getItem: async (key: string) => window.localStorage.getItem(key),
      setItem: async (key: string, value: string) => {
        window.localStorage.setItem(key, value);
      },
      removeItem: async (key: string) => {
        window.localStorage.removeItem(key);
      },
    }
  : undefined;

// Amplify configuration for Amazon Cognito
// Attach storage at the top-level (Amplify v6) to persist sessions across refreshes.
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
      region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
      // Simple username/password authentication without OAuth
    },
  },
  storage: localStorageAdapter,
};

// Configure Amplify
Amplify.configure(amplifyConfig);

// Log configuration for debugging (only in development)
if (import.meta.env.DEV) {
  console.log('Amplify configured with:', {
    userPoolId: amplifyConfig.Auth.Cognito.userPoolId,
    userPoolClientId: amplifyConfig.Auth.Cognito.userPoolClientId,
    region: amplifyConfig.Auth.Cognito.region,
  });
}

export default amplifyConfig;
