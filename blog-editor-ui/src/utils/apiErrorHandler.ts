import type { ApiError } from '../types';

/**
 * User-friendly error messages for common API errors
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  'NETWORK_ERROR': 'Unable to connect to the server. Please check your internet connection and try again.',
  'TIMEOUT_ERROR': 'The request timed out. Please try again.',

  // Authentication errors
  '401': 'Your session has expired. Please log in again.',
  '403': 'You do not have permission to perform this action.',

  // Client errors
  '400': 'Invalid request. Please check your input and try again.',
  '404': 'The requested resource was not found.',
  '409': 'This action conflicts with the current state. Please refresh and try again.',
  '422': 'The provided data is invalid. Please check your input.',

  // Server errors
  '500': 'An internal server error occurred. Please try again later.',
  '502': 'The server is temporarily unavailable. Please try again later.',
  '503': 'The service is temporarily unavailable. Please try again later.',
  '504': 'The request timed out. Please try again later.',

  // Default
  'DEFAULT': 'An unexpected error occurred. Please try again.'
};

/**
 * Convert an API error to a user-friendly message
 */
export function getErrorMessage(error: ApiError | Error | unknown): string {
  // Handle ApiError objects
  if (error && typeof error === 'object' && 'message' in error) {
    const apiError = error as ApiError;

    // Check for specific error codes first
    if (apiError.code && ERROR_MESSAGES[apiError.code]) {
      return ERROR_MESSAGES[apiError.code];
    }

    // Check for HTTP status codes
    if (apiError.status && ERROR_MESSAGES[apiError.status.toString()]) {
      return ERROR_MESSAGES[apiError.status.toString()];
    }

    // Return the original message if it's user-friendly
    if (apiError.message && !apiError.message.includes('fetch')) {
      return apiError.message;
    }
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    // Don't expose technical error messages to users
    if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
      return ERROR_MESSAGES['NETWORK_ERROR'];
    }

    return error.message;
  }

  // Fallback for unknown error types
  return ERROR_MESSAGES['DEFAULT'];
}

/**
 * Check if an error is retryable by the user
 */
export function isRetryableError(error: ApiError | Error | unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as ApiError).status;
    // Retry server errors and rate limiting, but not client errors
    return status ? status >= 500 || status === 429 : false;
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as ApiError).code;
    return code === 'NETWORK_ERROR' || code === 'TIMEOUT_ERROR';
  }

  return false;
}

/**
 * Check if an error requires re-authentication
 */
export function requiresReauth(error: ApiError | Error | unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as ApiError).status;
    return status === 401;
  }

  return false;
}

/**
 * Log error for debugging while protecting sensitive information
 */
export function logError(error: ApiError | Error | unknown, context?: string): void {
  const prefix = context ? `[${context}]` : '[API Error]';

  if (error && typeof error === 'object') {
    // Log structured error information
    console.error(prefix, {
      message: (error as any).message,
      status: (error as any).status,
      code: (error as any).code,
      timestamp: new Date().toISOString()
    });
  } else {
    console.error(prefix, error);
  }
}
