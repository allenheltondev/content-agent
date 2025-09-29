# Authentication Components

This directory contains authentication-related components for the Blog Editor application.

## Components

### ProtectedRoute
A wrapper component that ensures only authenticated users can access protected content. It handles:
- Loading states during authentication checks
- Redirecting unauthenticated users to login
- Rendering protected content for authenticated users

### LoginPage
A dedicated login page component that provides:
- Amazon Cognito Hosted UI integration
- Loading states during authentication
- Error handling for failed login attempts
- Responsive design with proper accessibility

## Authentication Flow

1. **Initial Load**: The app checks if the user is authenticated using AWS Amplify
2. **Unauthenticated**: Users are redirected to the login page
3. **Login**: Users click the login button and are redirected to Cognito Hosted UI
4. **Callback**: After successful authentication, users are redirected back to the app
5. **Authenticated**: Users can access the dashboard and other protected routes

## Key Features

- **Session Management**: Automatic token refresh and session validation
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Loading States**: Visual feedback during authentication operations
- **Session Cleanup**: Proper cleanup of local storage and session data on logout
- **Responsive Design**: Mobile-friendly authentication interface

## Configuration

Authentication is configured in `src/config/amplify.ts` using environment variables:
- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_USER_POOL_CLIENT_ID`
- `VITE_COGNITO_DOMAIN`
- `VITE_COGNITO_REDIRECT_SIGN_IN`
- `VITE_COGNITO_REDIRECT_SIGN_OUT`

## Usage

```tsx
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        {/* Your protected content */}
      </ProtectedRoute>
    </AuthProvider>
  );
}
```
