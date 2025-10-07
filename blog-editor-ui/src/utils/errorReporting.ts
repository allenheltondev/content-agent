/**
 * Error reporting utility for debugging and monitoring
 * Handles error collection, formatting, and reporting for development and production
 */

export interface ErrorReport {
  id: string;
  timestamp: number;
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  context: {
    postId?: string | null;
    hasContent?: boolean;
    componentName?: string;
    userId?: string;
    sessionId?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'editor' | 'apiauth' | 'storage' | 'network' | 'unknown';
  metadata?: Record<string, any>;
}

export interface ErrorReportingOptions {
  maxReports?: number;
  maxAge?: number;
  enableConsoleLogging?: boolean;
  enableLocalStorage?: boolean;
  enableRemoteReporting?: boolean;
}

const ERROR_REPORT_PREFIX = 'error_report_';
const DEFAULT_OPTIONS: Required<ErrorReportingOptions> = {
  maxReports: 100,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  enableConsoleLogging: true,
  enableLocalStorage: true,
  enableRemoteReporting: false // Would be true in production with proper endpoint
};

/**
 * Error reporting manager for debugging and monitoring
 */
export class ErrorReportingManager {
  private static options: Required<ErrorReportingOptions> = DEFAULT_OPTIONS;

  /**
   * Configure error reporting options
   */
  static configure(options: Partial<ErrorReportingOptions>): void {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Report an error with context
   */
  static reportError(
    error: Error,
    context: ErrorReport['context'] = {},
    severity: ErrorReport['severity'] = 'medium',
    category: ErrorReport['category'] = 'unknown',
    metadata?: Record<string, any>
  ): string {
    const reportId = this.generateReportId();

    const report: ErrorReport = {
      id: reportId,
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      context,
      severity,
      category,
      metadata
    };

    // Add component stack if available (from React error boundary)
    if (metadata?.errorInfo?.componentStack) {
      report.componentStack = metadata.errorInfo.componentStack;
    }

    // Console logging
    if (this.options.enableConsoleLogging) {
      this.logToConsole(report);
    }

    // Local storage
    if (this.options.enableLocalStorage) {
      this.saveToLocalStorage(report);
    }

    // Remote reporting (would be implemented in production)
    if (this.options.enableRemoteReporting) {
      this.sendToRemoteService(report);
    }

    return reportId;
  }

  /**
   * Report editor-specific error
   */
  static reportEditorError(
    error: Error,
    postId: string | null,
    componentName: string,
    hasContent: boolean,
    metadata?: Record<string, any>
  ): string {
    return this.reportError(
      error,
      { postId, componentName, hasContent },
      hasContent ? 'high' : 'medium',
      'editor',
      metadata
    );
  }

  /**
   * Report API error
   */
  static reportApiError(
    error: Error,
    endpoint: string,
    method: string,
    statusCode?: number,
    metadata?: Record<string, any>
  ): string {
    return this.reportError(
      error,
      { endpoint, method },
      statusCode && statusCode >= 500 ? 'high' : 'medium',
      'api',
      { statusCode, ...metadata }
    );
  }

  /**
   * Report storage error
   */
  static reportStorageError(
    error: Error,
    operation: string,
    key?: string,
    metadata?: Record<string, any>
  ): string {
    return this.reportError(
      error,
      { operation, key },
      'medium',
      'storage',
      metadata
    );
  }

  /**
   * Get all error reports
   */
  static getAllReports(): ErrorReport[] {
    if (!this.options.enableLocalStorage) {
      return [];
    }

    const reports: ErrorReport[] = [];
    const now = Date.now();

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(ERROR_REPORT_PREFIX)) {
          continue;
        }

        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;

          const report: ErrorReport = JSON.parse(stored);

          // Skip old reports
          if (now - report.timestamp > this.options.maxAge) {
            localStorage.removeItem(key);
            continue;
          }

          reports.push(report);
        } catch (parseError) {
          // Remove corrupted reports
          localStorage.removeItem(key);
        }
      }

      // Sort by timestamp (newest first)
      return reports.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.warn('Failed to get error reports:', error);
      return [];
    }
  }

  /**
   * Get reports by category
   */
  static getReportsByCategory(category: ErrorReport['category']): ErrorReport[] {
    return this.getAllReports().filter(report => report.category === category);
  }

  /**
   * Get reports by severity
   */
  static getReportsBySeverity(severity: ErrorReport['severity']): ErrorReport[] {
    return this.getAllReports().filter(report => report.severity === severity);
  }

  /**
   * Get error statistics
   */
  static getErrorStats(): {
    total: number;
    byCategory: Record<ErrorReport['category'], number>;
    bySeverity: Record<ErrorReport['severity'], number>;
    recentCount: number; // Last 24 hours
  } {
    const reports = this.getAllReports();
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);

    const stats = {
      total: reports.length,
      byCategory: { editor: 0, api: 0, auth: 0, storage: 0, network: 0, unknown: 0 },
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      recentCount: 0
    };

    reports.forEach(report => {
      stats.byCategory[report.category]++;
      stats.bySeverity[report.severity]++;

      if (report.timestamp > dayAgo) {
        stats.recentCount++;
      }
    });

    return stats;
  }

  /**
   * Clear old error reports
   */
  static cleanupOldReports(): number {
    if (!this.options.enableLocalStorage) {
      return 0;
    }

    let cleaned = 0;
    const now = Date.now();

    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(ERROR_REPORT_PREFIX)) {
          continue;
        }

        try {
          const stored = localStorage.getItem(key);
          if (!stored) {
            keysToRemove.push(key);
            continue;
          }

          const report: ErrorReport = JSON.parse(stored);
          if (now - report.timestamp > this.options.maxAge) {
            keysToRemove.push(key);
          }
        } catch (parseError) {
          keysToRemove.push(key);
        }
      }

      // Remove old reports
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleaned++;
      });

      // Also limit total number of reports
      const allReports = this.getAllReports();
      if (allReports.length > this.options.maxReports) {
        const excess = allReports.slice(this.options.maxReports);
        excess.forEach(report => {
          this.deleteReport(report.id);
          cleaned++;
        });
      }

      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} old error reports`);
      }

      return cleaned;
    } catch (error) {
      console.warn('Failed to cleanup old error reports:', error);
      return 0;
    }
  }

  /**
   * Delete a specific error report
   */
  static deleteReport(reportId: string): boolean {
    if (!this.options.enableLocalStorage) {
      return false;
    }

    try {
      const key = `${ERROR_REPORT_PREFIX}${reportId}`;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Failed to delete error report:', error);
      return false;
    }
  }

  /**
   * Export error reports for debugging
   */
  static exportReports(): string {
    const reports = this.getAllReports();
    const exportData = {
      timestamp: Date.now(),
      version: this.getAppVersion(),
      reports,
      stats: this.getErrorStats()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate unique report ID
   */
  private static generateReportId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error to console with formatting
   */
  private static logToConsole(report: ErrorReport): void {
    const prefix = `[${report.category.toUpperCase()}] [${report.severity.toUpperCase()}]`;

    console.group(`${prefix} Error Report ${report.id}`);
    console.error('Message:', report.message);

    if (report.stack) {
      console.error('Stack:', report.stack);
    }

    if (report.componentStack) {
      console.error('Component Stack:', report.componentStack);
    }

    console.log('Context:', report.context);

    if (report.metadata) {
      console.log('Metadata:', report.metadata);
    }

    console.log('Timestamp:', new Date(report.timestamp).toISOString());
    console.groupEnd();
  }

  /**
   * Save error report to localStorage
   */
  private static saveToLocalStorage(report: ErrorReport): void {
    try {
      const key = `${ERROR_REPORT_PREFIX}${report.id}`;
      localStorage.setItem(key, JSON.stringify(report));
    } catch (error) {
      console.warn('Failed to save error report to localStorage:', error);
    }
  }

  /**
   * Send error report to remote service (placeholder for production)
   */
  private static sendToRemoteService(report: ErrorReport): void {
    // In production, this would send to an error tracking service like Sentry
    console.log('Would send error report to remote service:', report.id);

    // Example implementation:
    // fetch('/api/errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(report)
    // }).catch(err => console.warn('Failed to send error report:', err));
  }

  /**
   * Get app version for error context
   */
  private static getAppVersion(): string {
    return import.meta.env.VITE_APP_VERSION || 'unknown';
  }
}
