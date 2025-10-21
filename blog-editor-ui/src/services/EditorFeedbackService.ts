import type { ToastMessage } from '../types';
import type { EditorError, RecoveryAction, RecoveryActionConfig } from './EditorErrorHandler';

/**
 * Success notification types
 */
export type SuccessNotificationType =
  | 'mode_switch_success'
  | 'suggestion_recalculation_success'
  | 'suggestion_recovery_success'
  | 'fallback_mode_enabled'
  | 'fallback_mode_disabled'
  | 'error_recovery_success';

/**
 * Success notification configuration
 */
export interface SuccessNotification {
  type: SuccessNotificationType;
  message: string;
  duration?: number;
  showIcon?: boolean;
  actionLabel?: string;
  actionHa?: () => void;
}

/**
 * Feedback service configuration
 */
export interface FeedbackServiceConfig {
  enableSuccessNotifications: boolean;
  enableRecoveryActions: boolean;
  enableProgressFeedback: boolean;
  defaultSuccessDuration: number;
  enableSoundFeedback: boolean;
}

/**
 * Default feedback service configuration
 */
const DEFAULT_CONFIG: FeedbackServiceConfig = {
  enableSuccessNotifications: true,
  enableRecoveryActions: true,
  enableProgressFeedback: true,
  defaultSuccessDuration: 3000,
  enableSoundFeedback: false, // Disabled by default for accessibility
};

/**
 * Service for providing user feedback on editor operations
 */
export class EditorFeedbackService {
  private config: FeedbackServiceConfig;
  private recoveryHandlers: Map<RecoveryAction, () => Promise<void> | void> = new Map();

  constructor(config: Partial<FeedbackServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeDefaultRecoveryHandlers();
  }

  /**
   * Show success notification
   */
  showSuccess(
    type: SuccessNotificationType,
    customMessage?: string,
    options?: Partial<SuccessNotification>
  ): SuccessNotification {
    if (!this.config.enableSuccessNotifications) {
      return this.createSuccessNotification(type, customMessage, options);
    }

    const notification = this.createSuccessNotification(type, customMessage, options);

    // Play success sound if enabled
    if (this.config.enableSoundFeedback) {
      this.playSuccessSound();
    }

    return notification;
  }

  /**
   * Create success notification object
   */
  private createSuccessNotification(
    type: SuccessNotificationType,
    customMessage?: string,
    options?: Partial<SuccessNotification>
  ): SuccessNotification {
    const defaultMessage = this.getSuccessMessage(type);

    return {
      type,
      message: customMessage || defaultMessage,
      duration: options?.duration || this.config.defaultSuccessDuration,
      showIcon: options?.showIcon ?? true,
      actionLabel: options?.actionLabel,
      actionHandler: options?.actionHandler,
      ...options,
    };
  }

  /**
   * Get default success messages
   */
  private getSuccessMessage(type: SuccessNotificationType): string {
    switch (type) {
      case 'mode_switch_success':
        return 'Editor mode switched successfully';

      case 'suggestion_recalculation_success':
        return 'Suggestions updated based on your changes';

      case 'suggestion_recovery_success':
        return 'Suggestions recovered successfully';

      case 'fallback_mode_enabled':
        return 'Fallback mode enabled - basic editing available';

      case 'fallback_mode_disabled':
        return 'Full functionality restored';

      case 'error_recovery_success':
        return 'Issue resolved successfully';

      default:
        return 'Operation completed successfully';
    }
  }

  /**
   * Create recovery action configurations for an error
   */
  createRecoveryActions(errorInfo: EditorError): RecoveryActionConfig[] {
    return errorInfo.recoveryActions.map(action => this.createRecoveryActionConfig(action, errorInfo));
  }

  /**
   * Create individual recovery action configuration
   */
  private createRecoveryActionConfig(
    action: RecoveryAction,
    errorInfo: EditorError
  ): RecoveryActionConfig {
    const handler = this.recoveryHandlers.get(action) || (() => {
      console.warn(`No handler registered for recovery action: ${action}`);
    });

    switch (action) {
      case 'retry':
        return {
          type: action,
          label: 'Try Again',
          description: 'Attempt the operation again',
          handler,
          primary: true,
        };

      case 'fallback':
        return {
          type: action,
          label: 'Use Basic Mode',
          description: 'Continue with limited functionality',
          handler,
          primary: false,
        };

      case 'manual_refresh':
        return {
          type: action,
          label: 'Refresh Suggestions',
          description: 'Manually refresh suggestions',
          handler,
          primary: false,
        };

      case 'skip_suggestions':
        return {
          type: action,
          label: 'Continue Without Suggestions',
          description: 'Continue editing without suggestion updates',
          handler,
          primary: false,
        };

      case 'reload_page':
        return {
          type: action,
          label: 'Reload Page',
          description: 'Refresh the entire page',
          handler,
          primary: false,
        };

      case 'contact_support':
        return {
          type: action,
          label: 'Contact Support',
          description: 'Get help with this issue',
          handler,
          primary: false,
        };

      default:
        return {
          type: action,
          label: 'Unknown Action',
          description: 'Unknown recovery action',
          handler,
          primary: false,
        };
    }
  }

  /**
   * Register a recovery action handler
   */
  registerRecoveryHandler(
    action: RecoveryAction,
    handler: () => Promise<void> | void
  ): void {
    this.recoveryHandlers.set(action, handler);
  }

  /**
   * Initialize default recovery handlers
   */
  private initializeDefaultRecoveryHandlers(): void {
    // Retry handler - to be overridden by specific implementations
    this.registerRecoveryHandler('retry', () => {
      console.log('Retry action triggered - should be overridden by specific implementation');
    });

    // Fallback mode handler
    this.registerRecoveryHandler('fallback', () => {
      console.log('Fallback mode enabled');
      // This would be handled by the error handler service
    });

    // Manual refresh handler
    this.registerRecoveryHandler('manual_refresh', () => {
      console.log('Manual refresh triggered');
      // This would trigger a manual suggestion refresh
    });

    // Skip suggestions handler
    this.registerRecoveryHandler('skip_suggestions', () => {
      console.log('Skipping suggestions');
      // This would disable suggestion updates temporarily
    });

    // Reload page handler
    this.registerRecoveryHandler('reload_page', () => {
      if (window.confirm('This will reload the page and you may lose unsaved changes. Continue?')) {
        window.location.reload();
      }
    });

    // Contact support handler
    this.registerRecoveryHandler('contact_support', () => {
      // This would open a support contact form or redirect to support
      console.log('Contact support triggered');
      window.open('mailto:support@example.com?subject=Editor Issue', '_blank');
    });
  }

  /**
   * Convert success notification to toast message
   */
  toToastMessage(notification: SuccessNotification): ToastMessage {
    return {
      id: `success_${Date.now()}`,
      type: 'success',
      message: notification.message,
      duration: notification.duration || this.config.defaultSuccessDuration,
    };
  }

  /**
   * Show progress feedback
   */
  showProgress(message: string, percentage?: number): void {
    if (!this.config.enableProgressFeedback) {
      return;
    }

    // This would integrate with a progress indicator component
    console.log(`Progress: ${message}${percentage ? ` (${percentage}%)` : ''}`);
  }

  /**
   * Play success sound (if enabled and supported)
   */
  private playSuccessSound(): void {
    try {
      // Create a subtle success sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      // Silently fail if audio is not supported
      console.debug('Audio feedback not available:', error);
    }
  }

  /**
   * Get configuration
   */
  getConfig(): FeedbackServiceConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<FeedbackServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear all registered handlers
   */
  clearHandlers(): void {
    this.recoveryHandlers.clear();
    this.initializeDefaultRecoveryHandlers();
  }
}

/**
 * Default editor feedback service instance
 */
export const editorFeedbackService = new EditorFeedbackService();

/**
 * Create a configured EditorFeedbackService instance
 */
export function createEditorFeedbackService(
  config?: Partial<FeedbackServiceConfig>
): EditorFeedbackService {
  return new EditorFeedbackService(config);
}
