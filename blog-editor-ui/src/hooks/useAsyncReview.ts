import { useState, useCallback, useRef, useEffect } from 'react';
import { ReviewService } from '../services/review-service';
import { useAuth } from '../hooks/useAuth';
import type {
  ReviewNotification,
  ReviewMessage,
  StartReviewResponse
} from '../types';

/**
 * Hook for managing consolidated review workflow.
 * This hook handles the complete review process from submission to completion
 * with real-time feedback through long polling.
 */

interface UseAsyncReviewOptions {
  baseUrl: string;
  onReviewComplete?: () => void;
  onReviewError?: (error: string) => void;
}

export const useAsyncReview = (options: UseAsyncReviewOptions) => {
  const { getToken } = useAuth();
  const [notifications, setNotifications] = useState<ReviewNotification[]>([]);
  const [isReviewInProgress, setIsReviewInProgress] = useState(false);
  const [currentReviewId, setCurrentReviewId] = useState<string | null>(null);

  const reviewServiceRef = useRef<ReviewService | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Initialize review service
  const getReviewService = useCallback(() => {
    if (!reviewServiceRef.current) {
      try {
        reviewServiceRef.current = new ReviewService({
          baseUrl: options.baseUrl,
          getAuthToken: getToken,
          pollingInterval: 5000,
          maxRetries: 3
        });
      } catch (initError) {
        console.error('Failed to initialize review service:', initError);
        throw new Error('Review service initialization failed. Please refresh the page and try again.');
      }
    }
    return reviewServiceRef.current;
  }, [options.baseUrl, getToken]);

  // Add notification
  const addNotification = useCallback((notification: Omit<ReviewNotification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const newNotification: ReviewNotification = {
      ...notification,
      id
    };

    setNotifications(prev => [...prev, newNotification]);
    return id;
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Start async review with consolidated workflow and enhanced error handling
  const startReview = useCallback(async (postId: string): Promise<void> => {
    if (isReviewInProgress) {
      throw new Error('A review is already in progress');
    }

    if (!postId || typeof postId !== 'string') {
      const errorMessage = 'Invalid post ID provided';
      addNotification({
        type: 'error',
        message: errorMessage
      });
      options.onReviewError?.(errorMessage);
      return;
    }

    try {
      setIsReviewInProgress(true);

      // Clear any existing notifications
      clearNotifications();

      const reviewService = getReviewService();

      // Show loading notification
      const loadingNotificationId = addNotification({
        type: 'loading',
        message: 'Starting content analysis...'
      });

      // Start the review - this now calls the review endpoint directly
      let reviewResponse: StartReviewResponse;
      try {
        reviewResponse = await reviewService.startReview(postId);
        setCurrentReviewId(reviewResponse.reviewId);
      } catch (startError) {
        // Remove loading notification
        removeNotification(loadingNotificationId);

        // Handle specific error types from the enhanced service
        let errorMessage: string;
        let retryable = true;

        if (startError instanceof Error && 'code' in startError) {
          const reviewError = startError as any;
          retryable = reviewError.retryable !== false; // Default to retryable unless explicitly false

          switch (reviewError.code) {
            case 'INVALID_INPUT':
              errorMessage = 'Invalid post data. Please check your content and try again.';
              retryable = false;
              break;
            case 'AUTH_ERROR':
              errorMessage = 'Authentication failed. Please refresh the page and try again.';
              retryable = false;
              break;
            case 'PERMISSION_ERROR':
              errorMessage = 'You do not have permission to review this post.';
              retryable = false;
              break;
            case 'NOT_FOUND':
              errorMessage = 'Post not found. It may have been deleted or moved.';
              retryable = false;
              break;
            case 'CONFLICT':
              errorMessage = 'A review is already in progress for this post. Please wait for it to complete.';
              retryable = false;
              break;
            case 'RATE_LIMITED':
              errorMessage = 'Too many review requests. Please wait a moment and try again.';
              retryable = true;
              break;
            case 'SERVER_ERROR':
            case 'SERVICE_UNAVAILABLE':
              errorMessage = 'Review service is temporarily unavailable. Please try again in a few moments.';
              retryable = true;
              break;
            case 'TIMEOUT_ERROR':
              errorMessage = 'Review request timed out. Please check your connection and try again.';
              retryable = true;
              break;
            case 'NETWORK_ERROR':
              errorMessage = 'Network error. Please check your internet connection and try again.';
              retryable = true;
              break;
            case 'RESPONSE_FORMAT_ERROR':
            case 'PARSE_ERROR':
              errorMessage = 'Review service configuration error. Please try again or contact support if the issue persists.';
              retryable = true;
              break;
            case 'HTTP_ERROR':
              // For HTTP errors, check if it's a server error (5xx) to determine retryability
              const isServerError = reviewError.status && reviewError.status >= 500;
              errorMessage = isServerError
                ? 'Review service is experiencing issues. Please try again in a few moments.'
                : reviewError.message || 'Review request failed. Please try again.';
              retryable = isServerError;
              break;
            default:
              errorMessage = reviewError.message || 'Failed to start review. Please try again.';
              // For unknown errors, default to retryable unless explicitly marked otherwise
              retryable = reviewError.retryable !== false;
          }
        } else if (startError instanceof Error) {
          // Handle generic Error objects
          errorMessage = startError.message || 'Failed to start review. Please try again.';
          // Try to determine retryability from error message patterns
          const isNetworkError = startError.message.includes('fetch') || startError.message.includes('network');
          const isTimeoutError = startError.message.includes('timeout') || startError.message.includes('abort');
          retryable = isNetworkError || isTimeoutError;
        } else {
          errorMessage = 'Failed to start review. Please try again.';
          retryable = true; // Default to retryable for unknown error types
        }

        throw { message: errorMessage, retryable };
      }

      // Validate the response format (additional validation after service normalization)
      if (!reviewResponse.token || !reviewResponse.endpoint) {
        removeNotification(loadingNotificationId);
        throw {
          message: 'Review service returned incomplete configuration. Please try again or contact support if the issue persists.',
          retryable: true,
          code: 'RESPONSE_FORMAT_ERROR'
        };
      }

      // Validate token format
      if (typeof reviewResponse.token !== 'string' || reviewResponse.token.trim().length === 0) {
        removeNotification(loadingNotificationId);
        throw {
          message: 'Review service returned invalid authentication token. Please try again.',
          retryable: true,
          code: 'INVALID_TOKEN_FORMAT'
        };
      }

      // Validate endpoint format
      try {
        new URL(reviewResponse.endpoint);
      } catch {
        removeNotification(loadingNotificationId);
        throw {
          message: 'Review service returned invalid endpoint URL. Please try again.',
          retryable: true,
          code: 'INVALID_ENDPOINT_FORMAT'
        };
      }

      // Update loading notification
      removeNotification(loadingNotificationId);
      addNotification({
        type: 'loading',
        message: 'Analysis in progress. You\'ll be notified when complete.'
      });

      // Start polling for completion using the provided token and endpoint
      const cleanup = await reviewService.subscribeToReviewUpdates(
        reviewResponse.token,
        reviewResponse.endpoint,
        (message: ReviewMessage) => {
          handleReviewMessage(message);
        },
        (error: Error) => {
          handlePollingError(error);
        }
      );

      cleanupRef.current = cleanup;

      // Automatically scroll to top after starting review
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error: any) {
      console.error('Failed to start review:', error);
      setIsReviewInProgress(false);
      setCurrentReviewId(null);

      const errorMessage = error.message || 'Failed to start review. Please try again.';
      const retryable = error.retryable !== false; // Default to retryable unless explicitly false

      addNotification({
        type: 'error',
        message: errorMessage,
        onRetry: retryable ? () => startReview(postId) : undefined
      });

      // Log detailed error information for debugging (but don't expose to user)
      if (error.code) {
        console.error(`Review start failed with code ${error.code}:`, {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          postId,
          timestamp: new Date().toISOString()
        });
      }

      options.onReviewError?.(errorMessage);
    }
  }, [isReviewInProgress, getReviewService, addNotification, removeNotification, clearNotifications, options]);

  // Handle review completion/error messages
  const handleReviewMessage = useCallback((message: ReviewMessage) => {
    setIsReviewInProgress(false);
    setCurrentReviewId(null);

    // Clean up polling
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Clear loading notifications
    setNotifications(prev => prev.filter(n => n.type !== 'loading'));

    if (message.type === 'review_complete') {
      if (message.success) {
        addNotification({
          type: 'success',
          message: 'Content analysis complete!',
          showRefresh: true,
          onRefresh: () => {
            options.onReviewComplete?.();
            // Remove this notification after refresh
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.message !== 'Content analysis complete!'));
            }, 100);
          }
        });
        options.onReviewComplete?.();
      } else {
        const errorMsg = message.error || 'Analysis completed with errors';
        addNotification({
          type: 'error',
          message: errorMsg,
          onRetry: currentReviewId ? () => {
            // Extract postId from current context if available
            // This is a simplified retry - in a real app you'd store the postId
            console.warn('Retry not implemented - postId not available in message context');
          } : undefined
        });
        options.onReviewError?.(errorMsg);
      }
    } else if (message.type === 'review_error') {
      addNotification({
        type: 'error',
        message: message.error,
        onRetry: message.retryable ? () => {
          // Same limitation as above - would need postId from context
          console.warn('Retry not implemented - postId not available in message context');
        } : undefined
      });
      options.onReviewError?.(message.error);
    }
  }, [addNotification, options, currentReviewId]);

  // Handle polling errors with comprehensive error handling for new workflow
  const handlePollingError = useCallback((error: Error) => {
    console.error('Review polling error:', error);
    setIsReviewInProgress(false);
    setCurrentReviewId(null);

    // Clean up polling
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Clear loading notifications and show error
    setNotifications(prev => prev.filter(n => n.type !== 'loading'));

    let errorMessage: string;
    let retryable = true;

    // Handle enhanced error types from the service
    if ('code' in error) {
      const reviewError = error as any;
      retryable = reviewError.retryable !== false;

      switch (reviewError.code) {
        case 'INVALID_TOKEN':
          errorMessage = 'Review session token is invalid. Please start a new review.';
          retryable = false;
          break;
        case 'INVALID_ENDPOINT':
          errorMessage = 'Review service endpoint is invalid. Please start a new review.';
          retryable = false;
          break;
        case 'AUTH_EXPIRED':
          errorMessage = 'Review session expired. Please start a new review.';
          retryable = false;
          break;
        case 'ACCESS_DENIED':
          errorMessage = 'Access denied to review updates. Please start a new review.';
          retryable = false;
          break;
        case 'SESSION_NOT_FOUND':
          errorMessage = 'Review session not found or expired. Please start a new review.';
          retryable = false;
          break;
        case 'SERVICE_UNAVAILABLE':
          errorMessage = 'Review service is temporarily unavailable. Please try again later.';
          retryable = true;
          break;
        case 'TIMEOUT_ERROR':
          errorMessage = 'Review polling timed out. Please check your connection and try again.';
          retryable = true;
          break;
        case 'NETWORK_ERROR':
          errorMessage = 'Network error during review. Please check your connection and try again.';
          retryable = true;
          break;
        case 'PARSE_ERROR':
        case 'MESSAGE_PARSE_ERROR':
          errorMessage = 'Review service sent invalid data. Please start a new review.';
          retryable = false;
          break;
        case 'INVALID_MESSAGE':
          errorMessage = 'Review service is not providing valid updates. Please start a new review.';
          retryable = false;
          break;
        case 'MAX_RETRIES_EXCEEDED':
          errorMessage = 'Review polling failed after multiple attempts. Please start a new review.';
          retryable = false;
          break;
        default:
          errorMessage = reviewError.message || 'Review service encountered an error. Please try again.';
      }
    } else {
      // Legacy error handling for backward compatibility
      const isTokenExpired = error.message.includes('token') || error.message.includes('401');
      const isNetworkError = error.message.includes('fetch') || error.message.includes('network');
      const isEndpointError = error.message.includes('endpoint') || error.message.includes('404');
      const isParsingError = error.message.includes('parse') || error.message.includes('JSON');

      if (isTokenExpired) {
        errorMessage = 'Review session expired. Please start a new review.';
        retryable = false;
      } else if (isEndpointError) {
        errorMessage = 'Review service endpoint not available. Please start a new review.';
        retryable = false;
      } else if (isParsingError) {
        errorMessage = 'Review service returned invalid data. Please start a new review.';
        retryable = false;
      } else if (isNetworkError) {
        errorMessage = 'Connection lost during review. Please check your internet connection and try again.';
        retryable = true;
      } else {
        errorMessage = error.message || 'Review service encountered an error. Please try again.';
      }
    }

    addNotification({
      type: 'error',
      message: errorMessage,
      // Only show retry if the error is retryable and we have a current review context
      onRetry: retryable && currentReviewId ? () => {
        // For polling errors, we typically need to restart the entire review
        // since the polling session is broken
        console.warn('Polling retry would require restarting review - not implemented');
      } : undefined
    });

    options.onReviewError?.(errorMessage);
  }, [addNotification, options, currentReviewId]);

  // Retry review with exponential backoff
  const retryReview = useCallback(async (postId: string, attempt: number = 1): Promise<void> => {
    const maxRetries = 3;
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds

    if (attempt > maxRetries) {
      throw new Error('Maximum retry attempts exceeded');
    }

    try {
      if (attempt > 1) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      await startReview(postId);
    } catch (error) {
      if (attempt < maxRetries) {
        console.warn(`Review attempt ${attempt} failed, retrying...`, error);
        return retryReview(postId, attempt + 1);
      }
      throw error;
    }
  }, [startReview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (reviewServiceRef.current) {
        reviewServiceRef.current.stopPolling();
      }
    };
  }, []);

  // Get error context for debugging
  const getErrorContext = useCallback(() => {
    return {
      isReviewInProgress,
      currentReviewId,
      hasActivePolling: !!cleanupRef.current,
      notificationCount: notifications.length,
      serviceInitialized: !!reviewServiceRef.current
    };
  }, [isReviewInProgress, currentReviewId, notifications.length]);

  return {
    // State
    notifications,
    isReviewInProgress,
    currentReviewId,

    // Actions
    startReview,
    retryReview,
    removeNotification,
    clearNotifications,

    // Utilities
    canStartReview: !isReviewInProgress,
    getErrorContext
  };
};
