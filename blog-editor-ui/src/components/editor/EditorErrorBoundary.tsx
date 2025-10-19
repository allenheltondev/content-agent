import { Component, type ReactNode, type ErrorInfo } from 'react';

import { logError } from '../../utils/apiErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, actions: EditorErrorActions) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  postId?: string | null;
  title?: string;
  content?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  backupSaved: boolean;
}

interface EditorErrorActions {
  retry: () => void;
  saveBackup: () => void;
  clearError: () => void;
  refreshPage: () => void;
}

/**
 * Specialized error boundary for editor components
 * Provides local storage backup for critical failures and error reporting
 */
export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      backupSaved: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error for debugging
    logError(error, 'EditorErrorBoundary');
    console.error('Editor error boundary caught error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Attempt to save backup automatically for critical failures
    this.saveBackupData();

    // Report error for debugging (in production, this would send to error tracking service)
    this.reportError(error, errorInfo);
  }

  /**
   * Save current editor content to local storage as backup
   */
  saveBackupData = (): void => {
    try {
      const { postId, title, content } = this.props;

      // Only save if there's meaningful content
      if (!title?.trim() && !content?.trim()) {
        return;
      }

      const backupKey = `editor_backup_${postId || 'new'}_${Date.now()}`;
      const backupData = {
        postId,
        title: title || '',
        content: content || '',
        timestamp: Date.now(),
        errorContext: this.state.error?.message || 'Unknown error'
      };

      localStorage.setItem(backupKey, JSON.stringify(backupData));
      this.setState({ backupSaved: true });

      console.log('Editor content backed up to localStorage:', backupKey);
    } catch (error) {
      console.warn('Failed to save editor backup:', error);
    }
  };

  /**
   * Report error for debugging and monitoring
   */
  reportError = (error: Error, errorInfo: ErrorInfo): void => {
    try {
      // In production, this would send to an error tracking service like Sentry
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        postId: this.props.postId,
        hasContent: Boolean(this.props.title?.trim() || this.props.content?.trim())
      };

      // For now, just log to console (in production, send to error service)
      console.error('Error report:', errorReport);

      // Store error report locally for debugging
      const reportKey = `error_report_${Date.now()}`;
      localStorage.setItem(reportKey, JSON.stringify(errorReport));
    } catch (reportError) {
      console.warn('Failed to report error:', reportError);
    }
  };

  /**
   * Retry by clearing error state
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      backupSaved: false
    });
  };

  /**
   * Manually save backup data
   */
  handleSaveBackup = (): void => {
    this.saveBackupData();
  };

  /**
   * Clear error state
   */
  handleClearError = (): void => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined
    });
  };

  /**
   * Refresh the page
   */
  handleRefreshPage = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const actions: EditorErrorActions = {
        retry: this.handleRetry,
        saveBackup: this.handleSaveBackup,
        clearError: this.handleClearError,
        refreshPage: this.handleRefreshPage
      };

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, actions);
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
          <div className="max-w-lg w-full space-y-6 p-8 text-center">
            {/* Error Icon */}
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <div>
              <h3 className="text-xl font-semibold text-red-900 mb-2">
                Editor Error
              </h3>
              <p className="text-red-700 mb-4">
                The editor encountered an unexpected error. Your content may have been automatically backed up.
              </p>

              {/* Backup Status */}
              {this.state.backupSaved && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-green-800">
                      Content backed up to local storage
                    </span>
                  </div>
                </div>
              )}

              {/* Error Details (collapsible) */}
              <details className="text-left bg-red-100 rounded-lg p-3 mb-4">
                <summary className="cursor-pointer text-sm text-red-800 hover:text-red-900 font-medium">
                  Error Details
                </summary>
                <div className="mt-2 space-y-2">
                  <div>
                    <span className="text-xs font-medium text-red-700">Message:</span>
                    <pre className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1 overflow-auto">
                      {this.state.error.message}
                    </pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <span className="text-xs font-medium text-red-700">Stack:</span>
                      <pre className="text-xs text-red-600 bg-red-50 p-2 rounded mt-1 overflow-auto max-h-32">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </button>

              {!this.state.backupSaved && (this.props.title?.trim() || this.props.content?.trim()) && (
                <button
                  onClick={this.handleSaveBackup}
                  className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Save Backup
                </button>
              )}

              <button
                onClick={this.handleRefreshPage}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Page
              </button>
            </div>

            {/* Recovery Instructions */}
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3">
              <p className="font-medium mb-1">Recovery Options:</p>
              <ul className="text-left space-y-1">
                <li>• Try the "Try Again" button to reload the editor</li>
                <li>• Check browser console for additional error details</li>
                <li>• If content was backed up, it will be available in browser storage</li>
                <li>• Refresh the page as a last resort</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
