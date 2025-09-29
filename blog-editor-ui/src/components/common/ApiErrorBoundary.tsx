import { Component, type ReactNode, type ErrorInfo } from 'react';
import { requiresReauth, isRetryableError, getErrorMessage, logError } from '../../utils/apiErrorHandler';

interface Props {
  children: ReactNode;
  onAuthRequired?: () => void;
  onRetry?: () => void;
  fallback?: (error: Error, actions: { retry?: () => void; reauth?: () => void }) => ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for API-related errors
 * Handles authentication errors and provides appropriate actions
 */
export class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, 'ApiErrorBoundary');
    console.error('ApiErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  handleReauth = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onAuthRequired?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const needsAuth = requiresReauth(this.state.error);
      const canRetry = isRetryableError(this.state.error);
      const errorMessage = getErrorMessage(this.state.error);

      // Use custom fallback if provided
      if (this.props.fallback) {
        const actions = {
          retry: canRetry ? this.handleRetry : undefined,
          reauth: needsAuth ? this.handleReauth : undefined
        };
        return this.props.fallback(this.state.error, actions);
      }

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>

            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {needsAuth ? 'Authentication Required' : 'Connection Error'}
              </h3>
              <p className="mt-1 text-sm text-red-700">
                {errorMessage}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {needsAuth && (
                  <button
                    onClick={this.handleReauth}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign In Again
                  </button>
                )}

                {canRetry && (
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                )}

                <button
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
