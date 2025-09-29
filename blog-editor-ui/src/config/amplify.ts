import { Amplify } from 'aws-amplify';

// Amplify configuration for Amazon Cognito
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
          scopes: ['email', 'openid', 'profile'],
          redirectSignIn: import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN || 'http://localhost:5173/',
          redirectSignOut: import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT || 'http://localhost:5173/',
          responseType: 'code' as const,
        },
      },
    },
  },
};

// Configure Amplify
Amplify.configure(amplifyConfig);

export default amplifyConfig;
