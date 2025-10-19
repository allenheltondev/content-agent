/**
 * Error boundary setup utility
 * Initializes error reporting and cleanup for the application
 */

import { ErrorReportingManager } from './errorReporting';
import { EditorBackupManager } from './editorBackup';
import { LocalStorageManager } from './localStorage';

/**
 * Initialize error boundary system
 * Should be called once when the app starts
 */
export function initializeErrorBoundarySystem(): void {
  try {
    // Configure error reporting
    ErrorReportingManager.configure({
      maxReports: 100,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      enableConsoleLogging: import.meta.env.DEV, // Only in development
      enableLocalStorage: true,
      enableRemoteReporting: import.meta.env.PROD // Only in production
    });

    // Clean up old data on startup
    performStartupCleanup();

    // Set up periodic cleanup
    setupPeriodicCleanup();

    // Set up global error handlers
    setupGlobalErrorHandlers();

    console.log('Error boundary system initialized');
  } catch (error) {
    console.warn('Failed to initialize error boundary system:', error);
  }
}

/**
 * Perform cleanup tasks on app startup
 */
function performStartupCleanup(): void {
  try {
    // Clean up old error reports
    const cleanedReports = ErrorReportingManager.cleanupOldReports();

    // Clean up old backups
    const cleanedBackups = EditorBackupManager.cleanupOldBackups();

    // Clean up old drafts
    LocalStorageManager.cleanupOldDrafts();

    if (cleanedReports > 0 || cleanedBackups > 0) {
      console.log(`Startup cleanup: ${cleanedReports} error reports, ${cleanedBackups} backups`);
    }
  } catch (error) {
    console.warn('Failed to perform startup cleanup:', error);
  }
}

/**
 * Set up periodic cleanup tasks
 */
function setupPeriodicCleanup(): void {
  // Clean up every hour
  const cleanupInterval = 60 * 60 * 1000; // 1 hour

  setInterval(() => {
    try {
      ErrorReportingManager.cleanupOldReports();
      EditorBackupManager.cleanupOldBackups();
      LocalStorageManager.cleanupOldDrafts();
    } catch (error) {
      console.warn('Failed to perform periodic cleanup:', error);
    }
  }, cleanupInterval);
}

/**
 * Set up global error handlers for unhandled errors
 */
function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);

    ErrorReportingManager.reportError(
      new Error(event.reason?.message || 'Unhandled promise rejection'),
      {},
      'medium',
      'unknown',
      { reason: event.reason, source: 'unhandledrejection' }
    );
  });

  // Handle global JavaScript errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);

    ErrorReportingManager.reportError(
      event.error || new Error(event.message),
      {},
      'high',
      'unknown',
      {
        source: 'global',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    );
  });
}

/**
 * Get system health information
 */
export function getSystemHealth(): {
  errorReports: ReturnType<typeof ErrorReportingManager.getErrorStats>;
  backups: ReturnType<typeof EditorBackupManager.getBackupStats>;
  storage: ReturnType<typeof LocalStorageManager.getStorageInfo>;
  storageSpace: ReturnType<typeof EditorBackupManager.checkStorageSpace>;
} {
  return {
    errorReports: ErrorReportingManager.getErrorStats(),
    backups: EditorBackupManager.getBackupStats(),
    storage: LocalStorageManager.getStorageInfo(),
    storageSpace: EditorBackupManager.checkStorageSpace()
  };
}

/**
 * Export system data for debugging
 */
export function exportSystemData(): {
  timestamp: number;
  health: ReturnType<typeof getSystemHealth>;
  errorReports: string;
  backups: ReturnType<typeof EditorBackupManager.getAllBackups>;
} {
  return {
    timestamp: Date.now(),
    health: getSystemHealth(),
    errorReports: ErrorReportingManager.exportReports(),
    backups: EditorBackupManager.getAllBackups()
  };
}

/**
 * Emergency cleanup - removes all error boundary data
 */
export function emergencyCleanup(): void {
  try {
    // Clear all error reports
    const reports = ErrorReportingManager.getAllReports();
    reports.forEach(report => {
      ErrorReportingManager.deleteReport(report.id);
    });

    // Clear all backups
    const backups = EditorBackupManager.getAllBackups();
    backups.forEach(backup => {
      EditorBackupManager.deleteBackup(backup.id);
    });

    // Clear all drafts
    LocalStorageManager.performCompleteCleanup();

    console.log('Emergency cleanup completed');
  } catch (error) {
    console.warn('Failed to perform emergency cleanup:', error);
  }
}
