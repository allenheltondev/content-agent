import { Amplify } from 'aws-amplify';

// Amplify configuration for Amazon Cognito
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
      region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1',
      // Simple username/password authentication without OAuth
    },
  },
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
