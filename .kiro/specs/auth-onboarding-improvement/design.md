# Design Document

## Overview

This design addresses the critical authentication onboarding issues by implementing a robust state management system that properly handles the signup-to-confirmation flow. The solution draws from proven patterns in AWS Amplify authentication and ensures users can complete the registration process without interruption.

## Architecture

### State Management Strategy

The core issue is that the current `useEffect` for authentication redirection interferes with the confirmation flow. The design implements a multi-state approach:

1. **Registration State Tracking**: Separate tracking of registration completion vs. authentication status
2. **Flow State Management**: Explicit state management for signup → confirmation → login flow
3. **Conditional Redirection**: Smart redirection logic that respects the current authentication flow step

### Authentication Flow States

```typescript
type AuthFlowState = 'idle' | 'registering' | 'confirming' | 'authenticated';
type AuthMode = 'login' | 'register' | 'confirm';
```

## Components and Interfaces

### Enhanced AuthContext Interface

```typescript
interface AuthContextType {
  // Existing properties
  user: CognitoUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Enhanced flow management
  authFlowState: AuthFlowState;
  pendingEmail: string | null;

  // Methods with improved return types
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<{
    isSignUpComplete: boolean;
    nextStep?: any
  }>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;

  // New flow management methods
  resetAuthFlow: () => void;
  setPendingEmail: (email: string) => void;
}
```

### LoginPage State Management

The LoginPage component will be refactored to use a more robust state management approach:

```typescript
interface LoginPageState {
  mode: AuthMode;
  formData: {
    email: string;
    password: string;
    name: string;
    confirmationCode: string;
  };
  error: string | null;
  isSubmitting: boolean;
  isResending: boolean;
  registrationStep: 'initial' | 'pending-confirmation' | 'confirmed';
}
```

## Data Models

### Registration Flow Tracking

```typescript
interface RegistrationFlow {
  email: string;
  step: 'registration' | 'confirmation' | 'complete';
  timestamp: number;
  attempts: number;
}
```

### Error Handling Model

```typescript
interface AuthError {
  type: 'network' | 'validation' | 'cognito' | 'unknown';
  code?: string;
  message: string;
  retryable: boolean;
  suggestedAction?: string;
}
```

## Error Handling

### Comprehensive Error Classification

1. **Network Errors**: Timeout, connection issues
   - Provide retry buttons
   - Show offline indicators
   - Cache form data for retry

2. **Validation Errors**: Client-side validation failures
   - Real-time field validation
   - Clear error messaging
   - Field-specific error states

3. **Cognito Errors**: AWS Cognito service errors
   - Map error codes to user-friendly messages
   - Provide specific guidance for resolution
   - Handle rate limiting gracefully

4. **Flow State Errors**: Invalid state transitions
   - Automatic recovery mechanisms
   - Clear path back to valid states
   - Preserve user progress where possible

### Error Recovery Patterns

```typescript
const errorRecoveryStrategies = {
  'UsernameExistsException': {
    message: 'An account with this email already exists',
    action: 'redirect-to-login',
    showResendOption: true
  },
  'CodeMismatchException': {
    message: 'Invalid confirmation code',
    action: 'retry-confirmation',
    showResendOption: true
  },
  'ExpiredCodeException': {
    message: 'Confirmation code has expired',
    action: 'auto-resend',
    showResendOption: true
  }
};
```

## Testing Strategy

### Unit Testing Focus

1. **AuthContext State Management**
   - Test all state transitions
   - Verify error handling paths
   - Mock AWS Amplify calls

2. **LoginPage Flow Logic**
   - Test mode switching
   - Verify form validation
   - Test error display and recovery

3. **Integration Testing**
   - End-to-end registration flow
   - Error scenario handling
   - State persistence across page refreshes

### Manual Testing Scenarios

1. **Happy Path Testing**
   - Complete registration → confirmation → login flow
   - Verify no unexpected redirections
   - Test automatic sign-in after confirmation

2. **Error Path Testing**
   - Network interruption during registration
   - Invalid confirmation codes
   - Expired confirmation codes
   - Duplicate email registration attempts

3. **Edge Case Testing**
   - Page refresh during confirmation
   - Browser back/forward navigation
   - Multiple tab scenarios
   - Session timeout handling

## Implementation Approach

### Phase 1: AuthContext Enhancement

1. Add flow state management to AuthContext
2. Implement proper return types for registration
3. Add pending email tracking
4. Enhance error handling with specific error types

### Phase 2: LoginPage Refactoring

1. Fix the useEffect redirection logic
2. Implement proper state management for registration flow
3. Add visual progress indicators
4. Improve error messaging and recovery options

### Phase 3: User Experience Improvements

1. Add loading states and progress indicators
2. Implement form data persistence
3. Add confirmation code formatting
4. Enhance accessibility features

### Phase 4: Testing and Validation

1. Comprehensive testing of all flow paths
2. Error scenario validation
3. Performance optimization
4. Cross-browser compatibility testing

## Key Design Decisions

### 1. Separate Registration and Authentication States

**Decision**: Track registration completion separately from authentication status
**Rationale**: Prevents premature redirection during the confirmation flow
**Implementation**: Use `authFlowState` and `registrationStep` tracking

### 2. Enhanced Return Types for Registration

**Decision**: Return detailed information about registration status
**Rationale**: Allows UI to make informed decisions about next steps
**Implementation**: Return `{ isSignUpComplete, nextStep }` from registration method

### 3. Conditional Redirection Logic

**Decision**: Only redirect authenticated users when not in confirmation flow
**Rationale**: Prevents the core issue of resetting to login during confirmation
**Implementation**: Check both `isAuthenticated` and `authFlowState` before redirecting

### 4. Persistent Email Tracking

**Decision**: Store pending email in AuthContext during registration flow
**Rationale**: Ensures email is available throughout confirmation process
**Implementation**: `pendingEmail` state in AuthContext with proper cleanup

This design addresses all the identified issues while maintaining backward compatibility and following AWS Amplify best practices.
