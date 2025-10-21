import { Component, type ReactNode, type ErrorInfo } from 'react';
import { editorErrorHandler } from '../../services/EditorErrorHandler';
import { ErrorRecoveryPanel } from './ErrorRecoveryPanel';

interface EditorErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
}

interface EditorErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

/**
 * Error boundary specifically designed for editor components
 * Provides comprehensive error handling and recovery options
 */
export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: EditorErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<EditorErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Handle the error with our error handler service
    const editorError = editorErrorHandler.handleError(
      error,
      'unknown_error',
      {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
        retryCount: this.state.retryCount,
      }
    );

    this.setState({
      errorInfo,
      errorId: `error_${editorError.timestamp}`,
    });

    // Call the optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log the error for debugging
    console.error('Editor Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleRecoveryAction = async (actionType: string) => {
    switch (actionType) {
      case 'retry':
        this.handleRetry();
        break;

      case 'reload_page':
        if (window.confirm('This will reload the page and you may lose unsaved changes. Continue?')) {
          window.location.reload();
        }
        break;

      case 'fallback':
        // Enable fallback mode and clear error
        editorErrorHandler.enableFallbackMode();
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          errorId: null,
        });
        break;

      case 'contact_support':
        // Open support contact
        const errorDetails = this.getErrorDetails();
        const subject = encodeURIComponent('Editor Error Report');
        const body = encodeURIComponent(`Error Details:\n${errorDetails}`);
        window.open(`mailto:support@example.com?subject=${subject}&body=${body}`, '_blank');
        break;

      default:
        console.warn(`Unknown recovery action: ${actionType}`);
    }
  };

  handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  getErrorDetails = (): string => {
    const { error, errorInfo, retryCount } = this.state;

    return [
      `Error: ${error?.message || 'Unknown error'}`,
      `Stack: ${error?.stack || 'No stack trace'}`,
      `Component Stack: ${errorInfo?.componentStack || 'No component stack'}`,
      `Retry Count: ${retryCount}`,
      `Timestamp: ${new Date().toISOString()}`,
      `User Agent: ${navigator.userAgent}`,
      `URL: ${window.location.href}`,
    ].join('\n\n');
  };

  render() {
    if (this.state.hasError) {
      // Show custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Show recovery panel if enabled
      if (this.props.enableRecovery !== false && this.state.error) {
        const editorError = editorErrorHandler.handleError(
          this.state.error,
          'unknown_error',
          {
            componentStack: this.state.errorInfo?.componentStack,
            errorBoundary: true,
            retryCount: this.state.retryCount,
          }
        );

        return (
          <div className="min-h-64 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <ErrorRecoveryPanel
                error={editorError}
                onRecoveryAction={this.handleRecoveryAction}
                onDismiss={this.handleDismiss}
                showTechnicalDetails={process.env.NODE_ENV === 'development'}
              />

              {/* Additional context for error boundary */}
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                <h4 className="font-medium text-gray-900 mb-2">What happened?</h4>
                <p className="text-gray-600 mb-2">
                  The editor encountered an unexpected error and had to stop. This is usually temporary.
                </p>

                {this.state.retryCount < this.maxRetries ? (
                  <p className="text-gray-600">
                    You can try again ({this.maxRetries - this.state.retryCount} attempts remaining) or use basic mode to continue.
                  </p>
                ) : (
                  <p className="text-gray-600">
                    Maximum retry attempts reached. Please reload the page or contact support if the problem persists.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      }

      // Default fallback UI
      return (
        <div className="min-h-64 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Something went wrong
            </h3>

            <p className="text-gray-600 mb-4">
              The editor encountered an unexpected error. Please try refreshing the page.
            </p>

            <div className="space-x-3">
              {this.state.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              )}

              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-32 text-gray-700">
                  {this.getErrorDetails()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC for wrapping components with error boundary
 */
export function withEditorErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<EditorErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EditorErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EditorErrorBoundary>
  );

  WrappedComponent.displayName = `withEditorErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}
