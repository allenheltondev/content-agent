import type { AuthError, ErrorRecoveryStrategy } from '../types';

/**
 * Comprehensive error classification and recovery strategies for authentication errors
 */
export class AuthErrorHandler {
  private static readonly ERROR_RECOVERY_STRATEGIES: Record<string, ErrorRecoveryStrategy> = {
    // User already exists errors
    'UsernameExistsException': {
      message: 'An account with this email already exists. Please try signing in instead.',
      action: 'redirect-to-login',
      showResendOption: false
    },
    'UserAlreadyExistsException': {
      message: 'An account with this email already exists. Please try signing in instead.',
      action: 'redirect-to-login',
      showResendOption: false
    },

    // Password validation errors
    'InvalidPasswordException': {
      message: 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.',
      action: 'retry-operation',
      showResendOption: false
    },
    'PasswordResetRequiredException': {
      message: 'Your password needs to be reset. Please check your email for reset instructions.',
      action: 'contact-support',
      showResendOption: false
    },

    // Confirmation code errors
    'CodeMismatchException': {
      message: 'Invalid confirmation code. Please check the code and try again.',
      action: 'retry-confirmation',
      showResendOption: true
    },
    'ExpiredCodeException': {
      message: 'Confirmation code has expired. A new code has been sent to your email.',
      action: 'auto-resend',
      showResendOption: true
    },
    'InvalidVerificationCodeException': {
      message: 'Invalid confirmation code. Please check the code and try again.',
      action: 'retry-confirmation',
      showResendOption: true
    },

    // Rate limiting errors
    'LimitExceededException': {
      message: 'Too many attempts. Please wait a few minutes before trying again.',
      action: 'retry-operation',
      showResendOption: false,
      retryDelay: 300000 // 5 minutes
    },
    'TooManyRequestsException': {
      message: 'Too many requests. Please wait a moment and try again.',
      action: 'retry-operation',
      showResendOption: false,
      retryDelay: 60000 // 1 minute
    },

    // User not found errors
    'UserNotFoundException': {
      message: 'User not found. Please check your email or try registering again.',
      action: 'redirect-to-login',
      showResendOption: false
    },
    'UserNotConfirmedException': {
      message: 'Your account is not confirmed. Please check your email for the confirmation code.',
      action: 'auto-resend',
      showResendOption: true
    },

    // Authentication errors
    'NotAuthorizedException': {
      message: 'Incorrect email or password. Please try again.',
      action: 'retry-operation',
      showResendOption: false
    },
    'UserNotAuthenticatedException': {
      message: 'You are not signed in. Please sign in to continue.',
      action: 'redirect-to-login',
      showResendOption: false
    },

    // Parameter validation errors
    'InvalidParameterException': {
      message: 'Please check that your email address is valid and try again.',
      action: 'retry-operation',
      showResendOption: false
    },
    'InvalidParameterValueException': {
      message: 'Invalid input provided. Please check your information and try again.',
      action: 'retry-operation',
      showResendOption: false
    },

    // Network and service errors
    'NetworkError': {
      message: 'Network connection error. Please check your internet connection and try again.',
      action: 'retry-operation',
      showResendOption: false,
      retryDelay: 5000 // 5 seconds
    },
    'ServiceException': {
      message: 'Service temporarily unavailable. Please try again in a few moments.',
      action: 'retry-operation',
      showResendOption: false,
      retryDelay: 30000 // 30 seconds
    },
    'InternalErrorException': {
      message: 'An internal error occurred. Please try again or contact support if the problem persists.',
      action: 'contact-support',
      showResendOption: false
    }
  };

  /**
   * Classifies and processes authentication errors into user-friendly AuthError objects
   */
  static processError(error: unknown, operation: string): AuthError {
    if (!error) {
      return this.createUnknownError('An unexpected error occurred', operation);
    }

    // Handle Error objects
    if (error instanceof Error) {
      return this.processErrorObject(error, operation);
    }

    // Handle string errors
    if (typeof error === 'string') {
      return this.processStringError(error, operation);
    }

    // Handle object errors (AWS SDK sometimes returns objects)
    if (typeof error === 'object' && error !== null) {
      return this.processObjectError(error, operation);
    }

    return this.createUnknownError('An unexpected error occurred', operation);
  }

  private static processErrorObject(error: Error, operation: string): AuthError {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name || '';

    // Check for specific Cognito error codes in the error name
    if (errorName && this.ERROR_RECOVERY_STRATEGIES[errorName]) {
      return this.createAuthError('cognito', errorName, error, operation);
    }

    // Check for error codes in the message
    const detectedCode = this.detectErrorCodeFromMessage(errorMessage);
    if (detectedCode) {
      return this.createAuthError('cognito', detectedCode, error, operation);
    }

    // Check for network-related errors
    if (this.isNetworkError(errorMessage)) {
      return this.createAuthError('network', 'NetworkError', error, operation);
    }

    // Check for validation errors
    if (this.isValidationError(errorMessage)) {
      return this.createAuthError('validation', 'InvalidParameterException', error, operation);
    }

    // Default to unknown error with original message
    return this.createAuthError('unknown', undefined, error, operation);
  }

  private static processStringError(error: string, operation: string): AuthError {
    const errorMessage = error.toLowerCase();

    // Check for error codes in the string
    const detectedCode = this.detectErrorCodeFromMessage(errorMessage);
    if (detectedCode) {
      const mockError = new Error(error);
      return this.createAuthError('cognito', detectedCode, mockError, operation);
    }

    // Check for network-related errors
    if (this.isNetworkError(errorMessage)) {
      const mockError = new Error(error);
      return this.createAuthError('network', 'NetworkError', mockError, operation);
    }

    // Default to unknown error
    const mockError = new Error(error);
    return this.createAuthError('unknown', undefined, mockError, operation);
  }

  private static processObjectError(error: any, operation: string): AuthError {
    const errorCode = error.code || error.name || error.__type;
    const errorMessage = error.message || error.Message || JSON.stringify(error);

    if (errorCode && this.ERROR_RECOVERY_STRATEGIES[errorCode]) {
      const mockError = new Error(errorMessage);
      return this.createAuthError('cognito', errorCode, mockError, operation);
    }

    const mockError = new Error(errorMessage);
    return this.createAuthError('unknown', undefined, mockError, operation);
  }

  private static detectErrorCodeFromMessage(message: string): string | null {
    // Common patterns for error codes in messages
    const patterns = [
      /usernameexistsexception/i,
      /useralreadyexistsexception/i,
      /invalidpasswordexception/i,
      /codemismatchexception/i,
      /expiredcodeexception/i,
      /limitexceededexception/i,
      /usernotfoundexception/i,
      /usernotconfirmedexception/i,
      /notauthorizedexception/i,
      /invalidparameterexception/i,
      /toomanyrequeststexception/i,
      /internalerrorexception/i
    ];

    for (const pattern of patterns) {
      if (pattern.test(message)) {
        // Convert regex match to proper error code format
        const match = message.match(pattern);
        if (match) {
          return this.normalizeErrorCode(match[0]);
        }
      }
    }

    // Check for specific error phrases
    if (message.includes('user already exists')) return 'UsernameExistsException';
    if (message.includes('invalid verification code')) return 'CodeMismatchException';
    if (message.includes('expired')) return 'ExpiredCodeException';
    if (message.includes('incorrect username or password')) return 'NotAuthorizedException';
    if (message.includes('user not found')) return 'UserNotFoundException';
    if (message.includes('too many')) return 'LimitExceededException';

    return null;
  }

  private static normalizeErrorCode(code: string): string {
    // Convert to proper PascalCase format
    return code.charAt(0).toUpperCase() + code.slice(1).toLowerCase()
      .replace(/exception$/i, 'Exception');
  }

  private static isNetworkError(message: string): boolean {
    const networkKeywords = ['network', 'timeout', 'connection', 'fetch', 'cors', 'offline'];
    return networkKeywords.some(keyword => message.includes(keyword));
  }

  private static isValidationError(message: string): boolean {
    const validationKeywords = ['invalid email', 'invalid format', 'required field', 'validation'];
    return validationKeywords.some(keyword => message.includes(keyword));
  }

  private static createAuthError(
    type: AuthError['type'],
    code: string | undefined,
    originalError: Error,
    _operation: string
  ): AuthError {
    const strategy = code ? this.ERROR_RECOVERY_STRATEGIES[code] : null;

    return {
      type,
      code,
      message: strategy?.message || originalError.message || 'An unexpected error occurred',
      retryable: this.isRetryable(type, code),
      suggestedAction: strategy?.action,
      originalError
    };
  }

  private static createUnknownError(message: string, _operation: string): AuthError {
    return {
      type: 'unknown',
      message,
      retryable: true,
      suggestedAction: 'retry-operation',
      originalError: new Error(message)
    };
  }

  private static isRetryable(type: AuthError['type'], code?: string): boolean {
    // Network errors are always retryable
    if (type === 'network') return true;

    // Some Cognito errors are retryable
    const retryableCodes = [
      'LimitExceededException',
      'TooManyRequestsException',
      'ServiceException',
      'InternalErrorException',
      'NetworkError'
    ];

    return code ? retryableCodes.includes(code) : true;
  }

  /**
   * Gets the recovery strategy for a specific error code
   */
  static getRecoveryStrategy(code: string): ErrorRecoveryStrategy | null {
    return this.ERROR_RECOVERY_STRATEGIES[code] || null;
  }

  /**
   * Determines if an error should trigger automatic resend of confirmation code
   */
  static shouldAutoResend(error: AuthError): boolean {
    return error.code === 'ExpiredCodeException';
  }

  /**
   * Gets the retry delay for rate-limited operations
   */
  static getRetryDelay(error: AuthError): number {
    if (!error.code) return 0;

    const strategy = this.ERROR_RECOVERY_STRATEGIES[error.code];
    return strategy?.retryDelay || 0;
  }

  /**
   * Formats error message for display to users
   */
  static formatErrorMessage(error: AuthError, context?: string): string {
    let message = error.message;

    if (context) {
      message = `${context}: ${message}`;
    }

    return message;
  }
}
