import { AuthErrorHandler } from '../authErrorHandler';
import type { AuthError } from '../../types';

describe('AuthErrorHandler', () => {
  describe('processError', () => {
    it('should handle Cognito UsernameExistsException', () => {
      const error = new Error('UsernameExistsException: User already exists');
      error.name = 'UsernameExistsException';

      const result = AuthErrorHandler.processError(error, 'register');

      expect(result.type).toBe('cognito');
      expect(result.code).toBe('UsernameExistsException');
      expect(result.message).toBe('An account with this email already exists. Please try signing in instead.');
      expect(result.retryable).toBe(false);
    });

    it('should handle network errors', () => {
      const error = new Error('Network timeout occurred');

      const result = AuthErrorHandler.processError(error, 'login');

      expect(result.type).toBe('network');
      expect(result.code).toBe('NetworkError');
      expect(result.retryable).toBe(true);
    });

    it('should handle expired confirmation codes', () => {
      const error = new Error('ExpiredCodeException: Code has expired');
      error.name = 'ExpiredCodeException';

      const result = AuthErrorHandler.processError(error, 'confirmRegistration');

      expect(result.type).toBe('cognito');
      expect(result.code).toBe('ExpiredCodeException');
      expect(result.retryable).toBe(false);
    });

    it('should handle unknown errors gracefully', () => {
      const error = new Error('Some unknown error');

      const result = AuthErrorHandler.processError(error, 'unknown');

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('Some unknown error');
      expect(result.retryable).toBe(true);
    });

    it('should handle string errors', () => {
      const error = 'Invalid password format';

      const result = AuthErrorHandler.processError(error, 'register');

      expect(result.type).toBe('unknown');
      expect(result.message).toBe('Invalid password format');
    });

    it('should handle object errors with AWS SDK format', () => {
      const error = {
        code: 'LimitExceededException',
        message: 'Too many attempts'
      };

      const result = AuthErrorHandler.processError(error, 'login');

      expect(result.type).toBe('cognito');
      expect(result.code).toBe('LimitExceededException');
      expect(result.retryable).toBe(true);
    });
  });

  describe('getRecoveryStrategy', () => {
    it('should return correct strategy for known error codes', () => {
      const strategy = AuthErrorHandler.getRecoveryStrategy('CodeMismatchException');

      expect(strategy).toBeDefined();
      expect(strategy?.action).toBe('retry-confirmation');
      expect(strategy?.showResendOption).toBe(true);
    });

    it('should return null for unknown error codes', () => {
      const strategy = AuthErrorHandler.getRecoveryStrategy('UnknownException');

      expect(strategy).toBeNull();
    });
  });

  describe('shouldAutoResend', () => {
    it('should return true for expired code errors', () => {
      const error: AuthError = {
        type: 'cognito',
        code: 'ExpiredCodeException',
        message: 'Code expired',
        retryable: false
      };

      const shouldResend = AuthErrorHandler.shouldAutoResend(error);

      expect(shouldResend).toBe(true);
    });

    it('should return false for other errors', () => {
      const error: AuthError = {
        type: 'cognito',
        code: 'CodeMismatchException',
        message: 'Invalid code',
        retryable: true
      };

      const shouldResend = AuthErrorHandler.shouldAutoResend(error);

      expect(shouldResend).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return correct delay for rate limited errors', () => {
      const error: AuthError = {
        type: 'cognito',
        code: 'LimitExceededException',
        message: 'Too many attempts',
        retryable: true
      };

      const delay = AuthErrorHandler.getRetryDelay(error);

      expect(delay).toBe(300000); // 5 minutes
    });

    it('should return 0 for errors without retry delay', () => {
      const error: AuthError = {
        type: 'cognito',
        code: 'CodeMismatchException',
        message: 'Invalid code',
        retryable: true
      };

      const delay = AuthErrorHandler.getRetryDelay(error);

      expect(delay).toBe(0);
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with context', () => {
      const error: AuthError = {
        type: 'cognito',
        code: 'UsernameExistsException',
        message: 'User already exists',
        retryable: false
      };

      const formatted = AuthErrorHandler.formatErrorMessage(error, 'Registration failed');

      expect(formatted).toBe('Registration failed: User already exists');
    });

    it('should return message without context when not provided', () => {
      const error: AuthError = {
        type: 'network',
        message: 'Network error',
        retryable: true
      };

      const formatted = AuthErrorHandler.formatErrorMessage(error);

      expect(formatted).toBe('Network error');
    });
  });
});
