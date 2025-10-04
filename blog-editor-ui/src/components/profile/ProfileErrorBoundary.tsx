import { Component, type ReactNode, type ErrorInfo } from 'react';
import { requiresReauth, isRetryableError, getErrorMessage, logError } from '../../utils/apiErrorHandler';
import type { ApiError } from '../../types';

interface Props {
  children: ReactNode;
  onAuthRequired?: () => void;
  onRetry?: () => void;
  fallback?: (error: Error, actions: ProfileErrorActions) => ReactNode;
  context?: 'setup' | 'edit' | 'load';
}

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

interface ProfileErrorActions {
  retry?: () => void;
  reauth?: () => void;
  goToDashboard?: () => void;
  refreshPage?: () => void;
}

/**
 * Error boundary specifically for profile-related operations
 * Provides context-aware error handling andcovery options
 */
export class ProfileErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logError(error, `ProfileErrorBoundary:${this.props.context || 'unknown'}`);
    console.error('ProfileErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1
      }));
      this.props.onRetry?.();
    }
  };

  handleReauth = () => {
    this.setState({ hasError: false, error: undefined, retryCount: 0 });
    this.props.onAuthRequired?.();
  };

  handleGoToDashboard = () => {
    window.location.href = '/dashboard';
  };

  handleRefreshPage = () => {
    window.location.reload();
  };

  getContextualErrorMessage = (error: Error): string => {
    const baseMessage = getErrorMessage(error);
    const { context } = this.props;

    switch (context) {
      case 'setup':
        return `We couldn't complete your profile setup. ${baseMessage}`;
      case 'edit':
        return `We couldn't save your profile changes. ${baseMessage}`;
      case 'load':
        return `We couldn't load your profile. ${baseMessage}`;
      default:
        return baseMessage;
    }
  };

  getContextualTitle = (): string => {
    const { context } = this.props;

    switch (context) {
      case 'setup':
        return 'Profile Setup Error';
      case 'edit':
        return 'Profile Update Error';
      case 'load':
        return 'Profile Loading Error';
      default:
        return 'Profile Error';
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const needsAuth = requiresReauth(this.state.error);
      const canRetry = isRetryableError(this.state.error) && this.state.retryCount < this.maxRetries;
      const errorMessage = this.getContextualErrorMessage(this.state.error);
      const title = this.getContextualTitle();

      // Use custom fallback if provided
      if (this.props.fallback) {
        const actions: ProfileErrorActions = {
          retry: canRetry ? this.handleRetry : undefined,
          reauth: needsAuth ? this.handleReauth : undefined,
          goToDashboard: this.handleGoToDashboard,
          refreshPage: this.handleRefreshPage
        };
        return this.props.fallback(this.state.error, actions);
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-bold text-gray-900">
                {title}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {errorMessage}
              </p>

              {this.state.retryCount > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Retry attempt {this.state.retryCount} of {this.maxRetries}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {needsAuth && (
                <button
                  onClick={this.handleReauth}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign In Again
                </button>
              )}

              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </button>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={this.handleGoToDashboard}
                  className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Go to Dashboard
                </button>

                <button
                  onClick={this.handleRefreshPage}
                  className="flex-1 flex justify-center items-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Page
                </button>
              </div>
            </div>

            {/* Additional help text based on context */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {this.props.context === 'setup' &&
                  "Don't worry - you can complete your profile setup later from the dashboard."
                }
                {this.props.context === 'edit' &&
                  "Your previous profile settings are still saved. You can try editing again later."
                }
                {this.props.context === 'load' &&
                  "You can still use the application. Some features may be limited without your profile."
                }
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
