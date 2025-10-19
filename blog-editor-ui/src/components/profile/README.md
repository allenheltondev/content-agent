# Profile Error Handling and Loading States

This directory contains comprehensive error handling and loading state components specifically designed for profile operations in the blog editor application.

## Components

### ProfileLoadingSpinner

A specialized loading spr component for profile operations with different variants and contextual messages.

**Props:**
- `message?: string` - Custom loading message
- `size?: 'sm' | 'md' | 'lg'` - Spinner size
- `variant?: 'page' | 'inline' | 'overlay'` - Display variant

**Usage:**
```tsx
import { ProfileLoadingSpinner, ProfileOperationLoading } from '../components/profile';

// Generic loading
<ProfileLoadingSpinner message="Loading profile..." variant="page" />

// Operation-specific loading
<ProfileOperationLoading operation="saving" variant="inline" />
```

### ProfileErrorBoundary

A React error boundary specifically designed for profile-related operations with context-aware error handling.

**Props:**
- `children: ReactNode` - Child components to wrap
- `onAuthRequired?: () => void` - Handler for authentication errors
- `onRetry?: () => void` - Handler for retry actions
- `context?: 'setup' | 'edit' | 'load'` - Operation context for better error messages
- `fallback?: (error: Error, actions: ProfileErrorActions) => ReactNode` - Custom error UI

**Features:**
- Context-aware error messages
- Automatic retry for retryable errors
- Authentication error handling
- Recovery options (dashboard, refresh page)
- Helpful user guidance based on context

**Usage:**
```tsx
import { ProfileErrorBoundary } from '../components/profile';

<ProfileErrorBoundary
  context="setup"
  onAuthRequired={handleAuthRequired}
>
  <ProfileSetupForm />
</ProfileErrorBoundary>
```

### ProfileErrorDisplay

An inline error display component for showing profile operation errors with recovery options.

**Props:**
- `error: Error | ApiError | null` - Error to display
- `onRetry?: () => void` - Retry handler
- `onDismiss?: () => void` - Dismiss handler
- `onAuthRequired?: () => void` - Auth required handler
- `context?: 'setup' | 'edit' | 'load' | 'save'` - Operation context
- `variant?: 'banner' | 'card' | 'inline'` - Display style
- `showRetryCount?: boolean` - Show retry attempt count
- `retryCount?: number` - Current retry count
- `maxRetries?: number` - Maximum retry attempts

**Features:**
- Context-aware error messages
- Multiple display variants
- Retry mechanism with attempt tracking
- Authentication error handling
- Dismissible errors

**Usage:**
```tsx
import { ProfileErrorDisplay } from '../components/profile';

<ProfileErrorDisplay
  error={error}
  onRetry={handleRetry}
  onDismiss={clearError}
  context="save"
  variant="card"
  showRetryCount={true}
  retryCount={retryCount}
  maxRetries={3}
/>
```

## Enhanced ProfileContext

The ProfileContext has been enhanced with comprehensive error handling and retry mechanisms:

**New Features:**
- Automatic retry logic for retryable errors
- Error state management with context
- Operation tracking for intelligent retries
- Enhanced loading states
- Error clearing functionality

**New Methods:**
- `clearError()` - Clear current error state
- `retryLastOperation()` - Retry the last failed operation
- `canRetry` - Boolean indicating if retry is possible
- `retryCount` - Current retry attempt count
- `lastOperation` - Type of last operation for context

## Hook: useProfileErrorHandling

A custom hook that provides consistent error handling patterns across profile components.

**Features:**
- Centralized error action handlers
- Toast notifications for errors
- Authentication error handling
- Retry logic with user feedback
- Error state utilities

**Usage:**
```tsx
import { useProfileErrorHandling } from '../hooks/useProfileErrorHandling';

const MyComponent = () => {
  const {
    error,
    canRetry,
    handleRetry,
    handleDismiss,
    getErrorActions,
    showErrorToast
  } = useProfileErrorHandling();

  // Use error actions
  const actions = getErrorActions(error);

  return (
    <ProfileErrorDisplay
      error={error}
      {...actions}
      context="edit"
    />
  );
};
```

## Error Types and Handling

### Network Errors
- **Code:** `NETWORK_ERROR`
- **Retryable:** Yes
- **User Message:** "Unable to connect to the server. Please check your internet connection and try again."
- **Actions:** Retry, Refresh Page

### Authentication Errors
- **Status:** 401
- **Retryable:** No
- **User Message:** "Your session has expired. Please log in again."
- **Actions:** Sign In Again

### Server Errors
- **Status:** 500, 502, 503, 504
- **Retryable:** Yes
- **User Message:** Context-specific server error message
- **Actions:** Retry, Refresh Page

### Validation Errors
- **Status:** 400, 422
- **Retryable:** No
- **User Message:** Specific validation error message
- **Actions:** Dismiss, Fix Input

## Implementation Examples

### Profile Setup Page
```tsx
export const ProfileSetupPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleAuthRequired = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <ProfileErrorBoundary
      context="setup"
      onAuthRequired={handleAuthRequired}
    >
      <ProfileSetupPageContent />
    </ProfileErrorBoundary>
  );
};

const ProfileSetupPageContent = () => {
  const { error, clearError, retryLastOperation, canRetry, retryCount } = useProfileContext();

  const handleRetry = async () => {
    if (canRetry) {
      await retryLastOperation();
    }
  };

  return (
    <div>
      {error && (
        <ProfileErrorDisplay
          error={error}
          onRetry={handleRetry}
          onDismiss={clearError}
          context="setup"
          variant="card"
          showRetryCount={true}
          retryCount={retryCount}
          maxRetries={3}
        />
      )}
      {/* Form content */}
    </div>
  );
};
```

### Profile Edit Page
```tsx
const ProfilePageContent = () => {
  const {
    updateProfile,
    isLoading,
    error,
    clearError,
    retryLastOperation,
    canRetry,
    retryCount
  } = useProfileContext();

  if (isLoading) {
    return <ProfileOperationLoading operation="loading" variant="page" />;
  }

  return (
    <div>
      {error && (
        <ProfileErrorDisplay
          error={error}
          onRetry={retryLastOperation}
          onDismiss={clearError}
          context="edit"
          variant="card"
          showRetryCount={true}
          retryCount={retryCount}
          maxRetries={3}
        />
      )}
      {/* Form content */}
    </div>
  );
};
```

## Testing

Use the `ProfileErrorTest` component to test all error handling scenarios:

```tsx
import { ProfileErrorTest } from '../components/profile';

// Add to your development routes
<Route path="/profile-error-test" element={<ProfileErrorTest />} />
```

This component allows you to simulate different error types and test the error handling behavior in a controlled environment.

## Best Practices

1. **Always wrap profile components with ProfileErrorBoundary** for JavaScript error handling
2. **Use ProfileErrorDisplay for API errors** that need user interaction
3. **Provide context-specific error messages** using the `context` prop
4. **Implement retry logic** for retryable errors
5. **Handle authentication errors** by redirecting to login
6. **Show loading states** during all async operations
7. **Clear errors** when starting new operations
8. **Provide helpful recovery options** for users
9. **Log errors** for debugging while protecting sensitive information
10. **Test error scenarios** using the ProfileErrorTest component
