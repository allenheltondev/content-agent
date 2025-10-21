import type { ToastMessage } from '../types';

/**
 * Error types specific to editor mode operations
 */
export type EditorErrorType =
  | 'mode_switch_failed'
  | 'suggestion_recalculation_failed'
  | 'suggestion_api_unavailable'
  | 'network_error'
  | 'timeout_error'
  | 'validation_error'
  | 'unknown_error';

/**
 * Error severity levels
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Recovery action types
 */
export type RecoveryAction =
  | 'retry'
  | 'fallback'
  | 'manual_refresh'
  | 'skip_suggestions'
  | 'reload_page'
  | 'contact_support';

/**
 * Structured error information
 */
export interface EditorError {
  type: EditorErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  technicalDetails?: string;
  recoveryActions: RecoveryAction[];
  retryable: boolean;
  timestamp: number;
  context?: Record<string, any>;
}

/**
 * Recovery action configuration
 */
export interface RecoveryActionConfig {
  type: RecoveryAction;
  label: string;
  description: string;
  handler: () => Promise<void> | void;
  primary?: boolean;
}

/**
 * Error handling configuration
 */
export interface ErrorHandlerConfig {
  enableAutoRetry: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  enableFallbackMode: boolean;
  enableUserNotifications: boolean;
  enableTechnicalDetails: boolean;
}

/**
 * Default error handler configuration
 */
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableAutoRetry: true,
  maxRetryAttempts: 3,
  retryDelay: 1000,
  enableFallbackMode: true,
  enableUserNotifications: true,
  enableTechnicalDetails: false, // Hide technical details from users by default
};

/**
 * Enhanced error handler for editor mode operations
 */
export class EditorErrorHandler {
  private config: ErrorHandlerConfig;
  private errorHistory: EditorError[] = [];
  private retryAttempts: Map<string, number> = new Map();
  private fallbackModeActive = false;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Handle an error with appropriate user feedback and recovery options
   */
  handleError(
    error: Error | string,
    type: EditorErrorType,
    context?: Record<string, any>
  ): EditorError {
    const errorInfo = this.createErrorInfo(error, type, context);

    // Add to error history
    this.errorHistory.push(errorInfo);

    // Keep only last 10 errors to prevent memory issues
    if (this.errorHistory.length > 10) {
      this.errorHistory = this.errorHistory.slice(-10);
    }

    return errorInfo;
  }

  /**
   * Create structured error information
   */
  private createErrorInfo(
    error: Error | string,
    type: EditorErrorType,
    context?: Record<string, any>
  ): EditorError {
    const message = typeof error === 'string' ? error : error.message;
    const technicalDetails = error instanceof Error ? error.stack : undefined;

    const errorInfo: EditorError = {
      type,
      severity: this.getErrorSeverity(type),
      message,
      userMessage: this.getUserFriendlyMessage(type, message),
      technicalDetails,
      recoveryActions: this.getRecoveryActions(type),
      retryable: this.isRetryable(type),
      timestamp: Date.now(),
      context,
    };

    return errorInfo;
  }

  /**
   * Get error severity based on type
   */
  private getErrorSeverity(type: EditorErrorType): ErrorSeverity {
    switch (type) {
      case 'mode_switch_failed':
        return 'high';
      case 'suggestion_recalculation_failed':
        return 'medium';
      case 'suggestion_api_unavailable':
        return 'medium';
      case 'network_error':
        return 'medium';
      case 'timeout_error':
        return 'medium';
      case 'validation_error':
        return 'low';
      case 'unknown_error':
      default:
        return 'high';
    }
  }

  /**
   * Get user-friendly error messages
   */
  private getUserFriendlyMessage(type: EditorErrorType, originalMessage: string): string {
    switch (type) {
      case 'mode_switch_failed':
        return 'Unable to switch editor modes. Please try again or refresh the page.';

      case 'suggestion_recalculation_failed':
        return 'Could not update suggestions based on your changes. You can continue editing and try switching to Review mode later.';

      case 'suggestion_api_unavailable':
        return 'The suggestion service is temporarily unavailable. You can continue editing, and suggestions will be updated when the service is restored.';

      case 'network_error':
        return 'Network connection issue. Please check your internet connection and try again.';

      case 'timeout_error':
        return 'The operation took too long to complete. Please try again.';

      case 'validation_error':
        return 'There was an issue with the provided data. Please check your input and try again.';

      case 'unknown_error':
      default:
        return 'An unexpected error occurred. Please try again or refresh the page if the problem persists.';
    }
  }

  /**
   * Get available recovery actions for error type
   */
  private getRecoveryActions(type: EditorErrorType): RecoveryAction[] {
    switch (type) {
      case 'mode_switch_failed':
        return ['retry', 'reload_page'];

      case 'suggestion_recalculation_failed':
        return ['retry', 'skip_suggestions', 'manual_refresh'];

      case 'suggestion_api_unavailable':
        return ['fallback', 'manual_refresh', 'skip_suggestions'];

      case 'network_error':
        return ['retry', 'reload_page'];

      case 'timeout_error':
        return ['retry', 'reload_page'];

      case 'validation_error':
        return ['retry'];

      case 'unknown_error':
      default:
        return ['retry', 'reload_page', 'contact_support'];
    }
  }

  /**
   * Check if error type is retryable
   */
  private isRetryable(type: EditorErrorType): boolean {
    switch (type) {
      case 'mode_switch_failed':
      case 'suggestion_recalculation_failed':
      case 'network_error':
      case 'timeout_error':
        return true;

      case 'suggestion_api_unavailable':
      case 'validation_error':
      case 'unknown_error':
      default:
        return false;
    }
  }

  /**
   * Check if we should attempt automatic retry
   */
  shouldAutoRetry(errorInfo: EditorError): boolean {
    if (!this.config.enableAutoRetry || !errorInfo.retryable) {
      return false;
    }

    const errorKey = `${errorInfo.type}_${errorInfo.timestamp}`;
    const attempts = this.retryAttempts.get(errorKey) || 0;

    return attempts < this.config.maxRetryAttempts;
  }

  /**
   * Record a retry attempt
   */
  recordRetryAttempt(errorInfo: EditorError): void {
    const errorKey = `${errorInfo.type}_${errorInfo.timestamp}`;
    const attempts = this.retryAttempts.get(errorKey) || 0;
    this.retryAttempts.set(errorKey, attempts + 1);
  }

  /**
   * Enable fallback mode for degraded functionality
   */
  enableFallbackMode(): void {
    if (this.config.enableFallbackMode) {
      this.fallbackModeActive = true;
    }
  }

  /**
   * Disable fallback mode
   */
  disableFallbackMode(): void {
    this.fallbackModeActive = false;
  }

  /**
   * Check if fallback mode is active
   */
  isFallbackModeActive(): boolean {
    return this.fallbackModeActive;
  }

  /**
   * Get error history
   */
  getErrorHistory(): EditorError[] {
    return [...this.errorHistory];
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
  }

  /**
   * Get configuration
   */
  getConfig(): ErrorHandlerConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Convert error to toast message
   */
  toToastMessage(errorInfo: EditorError): ToastMessage {
    return {
      id: `error_${errorInfo.timestamp}`,
      type: this.getToastType(errorInfo.severity),
      message: errorInfo.userMessage,
      duration: this.getToastDuration(errorInfo.severity),
    };
  }

  /**
   * Get toast type based on error severity
   */
  private getToastType(severity: ErrorSeverity): ToastMessage['type'] {
    switch (severity) {
      case 'low':
        return 'warning';
      case 'medium':
        return 'warning';
      case 'high':
      case 'critical':
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * Get toast duration based on error severity
   */
  private getToastDuration(severity: ErrorSeverity): number {
    switch (severity) {
      case 'low':
        return 4000;
      case 'medium':
        return 6000;
      case 'high':
        return 8000;
      case 'critical':
        return 10000;
      default:
        return 6000;
    }
  }
}

/**
 * Default editor error handler instance
 */
export const editorErrorHandler = new EditorErrorHandler();

/**
 * Create a configured EditorErrorHandler instance
 */
export function createEditorErrorHandler(
  config?: Partial<ErrorHandlerConfig>
): EditorErrorHandler {
  return new EditorErrorHandler(config);
}
