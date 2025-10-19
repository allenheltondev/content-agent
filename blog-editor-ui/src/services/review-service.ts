import type {
  StartReviewResponse,
  ReviewMessage,
  ReviewServiceConfig,
  ApiError
} from '../types';

interface ReviewError extends Error {
  code: string;
  status?: number;
  retryable: boolean;
  originalError?: Error;
}

export class ReviewService {
  private config: ReviewServiceConfig;
  private abortController: AbortController | null = null;

  constructor(config: ReviewServiceConfig) {
    this.config = {
      pollingInterval: 5000, // 5 seconds default
      maxRetries: 3,
      ...config
    };
  }

  /**
   * Start an async review for a post with comprehensive error handling
   */
  async startReview(postId: string): Promise<StartReviewResponse> {
    if (!postId || typeof postId !== 'string') {
      throw this.createReviewError('Invalid post ID provided', 'INVALID_INPUT', false);
    }

    try {
      const token = await this.config.getAuthToken();
      if (!token) {
        throw this.createReviewError('Authentication token not available', 'AUTH_ERROR', false);
      }

      // Normalize base URL to ensure '/api' prefix is present and no trailing slash
      const base = (this.config.baseUrl || '').replace(/\/$/, '');
      const apiBase = base.endsWith('/api') ? base : `${base}/api`;
      const url = `${apiBase}/posts/${encodeURIComponent(postId)}/reviews`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        let errorData: any = {};
        let errorMessage: string;

        try {
          errorData = await response.json();
        } catch {
          // If we can't parse the error response, use status text
        }

        // Provide specific error messages based on status codes
        switch (response.status) {
          case 400:
            errorMessage = errorData.message || 'Invalid request. Please check your post content and try again.';
            throw this.createReviewError(errorMessage, 'INVALID_INPUT', false, response.status);
          case 401:
            errorMessage = 'Authentication failed. Please refresh the page and try again.';
            throw this.createReviewError(errorMessage, 'AUTH_ERROR', false, response.status);
          case 403:
            errorMessage = 'You do not have permission to review this post.';
            throw this.createReviewError(errorMessage, 'PERMISSION_ERROR', false, response.status);
          case 404:
            errorMessage = 'Post not found. It may have been deleted or moved.';
            throw this.createReviewError(errorMessage, 'NOT_FOUND', false, response.status);
          case 409:
            errorMessage = 'A review is already in progress for this post. Please wait for it to complete.';
            throw this.createReviewError(errorMessage, 'CONFLICT', false, response.status);
          case 429:
            errorMessage = 'Too many review requests. Please wait a moment and try again.';
            throw this.createReviewError(errorMessage, 'RATE_LIMITED', true, response.status);
          case 500:
          case 502:
          case 503:
          case 504:
            errorMessage = errorData.message || 'Review service is temporarily unavailable. Please try again in a few moments.';
            throw this.createReviewError(errorMessage, 'SERVER_ERROR', true, response.status);
          default:
            errorMessage = errorData.message || `Review failed with status ${response.status}`;
            throw this.createReviewError(errorMessage, 'HTTP_ERROR', response.status >= 500, response.status);
        }
      }

      let rawResponse: any;
      try {
        rawResponse = await response.json();
      } catch (parseError) {
        throw this.createReviewError(
          'Review service returned invalid response format',
          'PARSE_ERROR',
          true,
          undefined,
          parseError instanceof Error ? parseError : new Error(String(parseError))
        );
      }

      // Handle backward compatibility by normalizing the response format
      try {
        return this.normalizeStartReviewResponse(rawResponse, postId);
      } catch (normalizeError) {
        throw this.createReviewError(
          'Review service response format is invalid',
          'RESPONSE_FORMAT_ERROR',
          false,
          undefined,
          normalizeError instanceof Error ? normalizeError : new Error(String(normalizeError))
        );
      }
    } catch (error) {
      // Handle network and other errors
      if (error && typeof error === 'object' && 'code' in error && 'retryable' in error) {
        throw error; // Re-throw our custom errors
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
          throw this.createReviewError(
            'Review request timed out. Please check your connection and try again.',
            'TIMEOUT_ERROR',
            true,
            undefined,
            error
          );
        }

        if (error.message.includes('fetch') || error.message.includes('network')) {
          throw this.createReviewError(
            'Network error. Please check your internet connection and try again.',
            'NETWORK_ERROR',
            true,
            undefined,
            error
          );
        }
      }

      // Fallback for unknown errors
      throw this.createReviewError(
        'An unexpected error occurred while starting the review',
        'UNKNOWN_ERROR',
        true,
        undefined,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Subscribe to review completion notifications using HTTP polling with enhanced error handling
   */
  async subscribeToReviewUpdates(
    token: string,
    endpoint: string,
    onMessage: (message: ReviewMessage) => void,
    onError: (error: Error) => void
  ): Promise<() => void> {
    // Validate inputs
    if (!token || typeof token !== 'string') {
      onError(this.createReviewError('Invalid polling token provided', 'INVALID_TOKEN', false));
      return () => {};
    }

    if (!endpoint || typeof endpoint !== 'string') {
      onError(this.createReviewError('Invalid polling endpoint provided', 'INVALID_ENDPOINT', false));
      return () => {};
    }

    // Cancel any existing polling
    this.stopPolling();

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const poll = async () => {
      let retryCount = 0;
      let consecutiveFailures = 0;
      const maxConsecutiveFailures = 5;

      while (!signal.aborted && retryCount < (this.config.maxRetries || 3)) {
        try {
          // Use the provided endpoint directly instead of constructing URL
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Authorization': `${token}`
            },
            signal,
            // Add timeout for individual polling requests
            ...(AbortSignal.timeout ? { signal: AbortSignal.timeout(15000) } : {})
          });

          if (response.ok) {
            let data: any;
            try {
              data = await response.json();
            } catch (parseError) {
              console.error('Failed to parse polling response:', parseError);
              consecutiveFailures++;

              if (consecutiveFailures >= maxConsecutiveFailures) {
                onError(this.createReviewError(
                  'Review service is returning invalid data. Please try starting the review again.',
                  'PARSE_ERROR',
                  false,
                  undefined,
                  parseError instanceof Error ? parseError : new Error(String(parseError))
                ));
                return;
              }

              // Continue polling despite parse error
              await this.delay(this.config.pollingInterval || 5000);
              continue;
            }

            // Check if we received a message
            if (data.items && Array.isArray(data.items) && data.items.length > 0) {
              const latestMessage = data.items[0];

              if (!latestMessage || !latestMessage.value) {
                console.warn('Received empty message from polling endpoint');
                consecutiveFailures++;

                if (consecutiveFailures >= maxConsecutiveFailures) {
                  onError(this.createReviewError(
                    'Review service is not providing valid updates. Please try again.',
                    'INVALID_MESSAGE',
                    true
                  ));
                  return;
                }
              } else {
                try {
                  const parsedMessage: ReviewMessage = JSON.parse(latestMessage.value);

                  // Validate message structure
                  if (!parsedMessage.type) {
                    throw new Error('Message missing required type field');
                  }

                  onMessage(parsedMessage);
                  return; // Stop polling after receiving valid message
                } catch (parseError) {
                  console.error('Failed to parse review message:', parseError);
                  consecutiveFailures++;

                  if (consecutiveFailures >= maxConsecutiveFailures) {
                    onError(this.createReviewError(
                      'Review service sent invalid message format. Please try starting the review again.',
                      'MESSAGE_PARSE_ERROR',
                      false,
                      undefined,
                      parseError instanceof Error ? parseError : new Error(String(parseError))
                    ));
                    return;
                  }
                }
              }
            }

            // Reset failure count on successful request (even if no message)
            consecutiveFailures = 0;
            retryCount = 0;
          } else {
            // Handle specific HTTP error codes
            switch (response.status) {
              case 401:
                onError(this.createReviewError(
                  'Authentication expired during review. Please try starting the review again.',
                  'AUTH_EXPIRED',
                  false,
                  response.status
                ));
                return;
              case 403:
                console.warn('[Review] Subscribe endpoint returned 403. Live updates disabled. Manually refresh after ~1 minute.');
                onError(this.createReviewError(
                  'Access denied to review updates. Please try starting the review again.',
                  'ACCESS_DENIED',
                  false,
                  response.status
                ));
                return;
              case 404:
                onError(this.createReviewError(
                  'Review session not found. It may have expired. Please start a new review.',
                  'SESSION_NOT_FOUND',
                  false,
                  response.status
                ));
                return;
              case 429:
                // Rate limited - wait longer before retry
                retryCount++;
                console.warn(`Polling rate limited (attempt ${retryCount})`);
                if (retryCount < (this.config.maxRetries || 3)) {
                  await this.delay((this.config.pollingInterval || 5000) * 2); // Double the wait time
                  continue;
                }
                break;
              case 500:
              case 502:
              case 503:
              case 504:
                retryCount++;
                consecutiveFailures++;
                console.warn(`Polling server error ${response.status} (attempt ${retryCount})`);
                break;
              default:
                retryCount++;
                consecutiveFailures++;
                console.warn(`Polling failed with status ${response.status} (attempt ${retryCount})`);
            }

            if (consecutiveFailures >= maxConsecutiveFailures) {
              onError(this.createReviewError(
                'Review service is experiencing issues. Please try starting the review again.',
                'SERVICE_UNAVAILABLE',
                true,
                response.status
              ));
              return;
            }
          }
        } catch (error) {
          if (signal.aborted) {
            return; // Polling was cancelled
          }

          retryCount++;
          consecutiveFailures++;

          let errorMessage = 'Unknown polling error';
          let errorCode = 'POLLING_ERROR';
          let retryable = true;

          if (error instanceof Error) {
            if (error.name === 'AbortError' || error.name === 'TimeoutError') {
              errorMessage = 'Review polling timed out. Please check your connection.';
              errorCode = 'TIMEOUT_ERROR';
            } else if (error.message.includes('fetch') || error.message.includes('network')) {
              errorMessage = 'Network error during review polling. Please check your connection.';
              errorCode = 'NETWORK_ERROR';
            } else {
              errorMessage = error.message;
            }
          }

          console.error(`Polling error (attempt ${retryCount}):`, error);

          if (retryCount >= (this.config.maxRetries || 3) || consecutiveFailures >= maxConsecutiveFailures) {
            onError(this.createReviewError(
              `${errorMessage} Please try starting the review again.`,
              errorCode,
              retryable,
              undefined,
              error instanceof Error ? error : new Error(String(error))
            ));
            return;
          }
        }

        // Wait before next poll attempt with exponential backoff
        if (!signal.aborted) {
          const delay = Math.min(
            (this.config.pollingInterval || 5000) * Math.pow(1.5, consecutiveFailures),
            30000 // Max 30 seconds
          );
          await this.delay(delay);
        }
      }

      // If we exit the loop without returning, we've exceeded max retries
      if (!signal.aborted) {
        onError(this.createReviewError(
          'Review polling failed after multiple attempts. Please try starting the review again.',
          'MAX_RETRIES_EXCEEDED',
          true
        ));
      }
    };

    // Start polling
    poll();

    // Return cleanup function
    return () => this.stopPolling();
  }

  /**
   * Stop active polling
   */
  stopPolling(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Normalize the start review response to handle backward compatibility with enhanced validation
   */
  private normalizeStartReviewResponse(rawResponse: any, postId: string): StartReviewResponse {
    if (!rawResponse || typeof rawResponse !== 'object') {
      throw new Error('Review response is empty or invalid');
    }

    // Handle new format (preferred)
    if (rawResponse.token && rawResponse.endpoint) {
      // Validate token format
      if (typeof rawResponse.token !== 'string' || rawResponse.token.trim().length === 0) {
        throw new Error('Review response contains invalid token');
      }

      // Validate endpoint format
      if (typeof rawResponse.endpoint !== 'string' || !this.isValidUrl(rawResponse.endpoint)) {
        throw new Error('Review response contains invalid endpoint URL');
      }

      return {
        reviewId: rawResponse.reviewId || postId,
        token: rawResponse.token.trim(),
        endpoint: rawResponse.endpoint.trim(),
        expiresAt: this.validateExpirationTime(rawResponse.expiresAt)
      };
    }

    // Handle old format for backward compatibility
    if (rawResponse.momentoToken && rawResponse.subscribeUrl) {
      // Validate momento token
      if (typeof rawResponse.momentoToken !== 'string' || rawResponse.momentoToken.trim().length === 0) {
        throw new Error('Review response contains invalid momento token');
      }

      let endpoint: string;
      if (rawResponse.subscribeUrl) {
        if (typeof rawResponse.subscribeUrl !== 'string' || !this.isValidUrl(rawResponse.subscribeUrl)) {
          throw new Error('Review response contains invalid subscribe URL');
        }
        endpoint = rawResponse.subscribeUrl.trim();
      } else if (rawResponse.topicName) {
        if (typeof rawResponse.topicName !== 'string' || rawResponse.topicName.trim().length === 0) {
          throw new Error('Review response contains invalid topic name');
        }
        // Construct endpoint from topic name
        const cacheName = process.env.MOMENTO_CACHE_NAME || 'default';
        endpoint = `https://api.cache.cell-1-us-east-1.prod.a.momentohq.com/topics/${cacheName}/${rawResponse.topicName.trim()}`;
      } else {
        throw new Error('Review response missing both subscribeUrl and topicName');
      }

      return {
        reviewId: rawResponse.reviewId || postId,
        token: rawResponse.momentoToken.trim(),
        endpoint: endpoint,
        expiresAt: this.validateExpirationTime(rawResponse.expiresAt)
      };
    }

    // Check for partial data to provide better error messages
    if (rawResponse.token && !rawResponse.endpoint) {
      throw new Error('Review service response is incomplete: missing endpoint URL. Please try again.');
    }
    if (!rawResponse.token && rawResponse.endpoint) {
      throw new Error('Review service response is incomplete: missing authentication token. Please try again.');
    }
    if (rawResponse.momentoToken && !rawResponse.topicName && !rawResponse.subscribeUrl) {
      throw new Error('Review service response is incomplete: missing topic information. Please try again.');
    }

    // Provide more specific error for completely invalid responses
    const hasNewFormat = rawResponse.token || rawResponse.endpoint;
    const hasOldFormat = rawResponse.momentoToken || rawResponse.topicName || rawResponse.subscribeUrl;

    if (!hasNewFormat && !hasOldFormat) {
      throw new Error('Review service returned an invalid response format. Please try again or contact support if the issue persists.');
    }

    throw new Error('Review service response format is invalid: missing required authentication and endpoint fields. Please try again.');
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate and normalize expiration time
   */
  private validateExpirationTime(expiresAt: any): number {
    if (typeof expiresAt === 'number' && expiresAt > Date.now() / 1000) {
      return expiresAt;
    }

    // Default to 10 minutes from now if not provided or invalid
    return Math.floor(Date.now() / 1000) + (10 * 60);
  }

  /**
   * Create a standardized review error with enhanced information
   */
  private createReviewError(
    message: string,
    code: string,
    retryable: boolean,
    status?: number,
    originalError?: Error
  ): ReviewError {
    const error = new Error(message) as ReviewError;
    error.code = code;
    error.retryable = retryable;
    error.status = status;
    error.originalError = originalError;
    return error;
  }



  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a review error is retryable with enhanced logic
   */
  isRetryableError(error: ApiError | ReviewError): boolean {
    // If it's a ReviewError, use the retryable flag
    if ('retryable' in error) {
      return error.retryable;
    }

    // Legacy ApiError handling
    // Network errors and 5xx errors are typically retryable
    return !error.status || error.status >= 500 || error.code === 'NETWORK_ERROR';
  }

  /**
   * Get retry delay with exponential backoff
   */
  getRetryDelay(attempt: number): number {
    return Math.min(1000 * Math.pow(2, attempt), 30000); // Max 30 seconds
  }

  /**
   * Get user-friendly error recovery suggestions
   */
  getErrorRecoverySuggestion(error: ReviewError): string {
    switch (error.code) {
      case 'INVALID_INPUT':
        return 'Please check that your post has both a title and content before submitting for review.';
      case 'AUTH_ERROR':
      case 'AUTH_EXPIRED':
        return 'Please refresh the page to re-authenticate and try again.';
      case 'PERMISSION_ERROR':
      case 'ACCESS_DENIED':
        return 'You may not have permission to review this post. Please contact your administrator.';
      case 'NOT_FOUND':
        return 'The post may have been deleted. Please check the post list and try again.';
      case 'CONFLICT':
        return 'Please wait for the current review to complete before starting a new one.';
      case 'RATE_LIMITED':
        return 'Please wait a few moments before submitting another review request.';
      case 'NETWORK_ERROR':
        return 'Please check your internet connection and try again.';
      case 'TIMEOUT_ERROR':
        return 'The request timed out. Please check your connection and try again.';
      case 'PARSE_ERROR':
      case 'RESPONSE_FORMAT_ERROR':
        return 'There was an issue with the review service. Please try again or contact support.';
      case 'SERVER_ERROR':
      case 'SERVICE_UNAVAILABLE':
        return 'The review service is temporarily unavailable. Please try again in a few minutes.';
      default:
        return error.retryable
          ? 'Please try again. If the problem persists, contact support.'
          : 'Please refresh the page and try again. If the problem persists, contact support.';
    }
  }
}

// Default service instance factory
export const createReviewService = (config: ReviewServiceConfig): ReviewService => {
  return new ReviewService(config);
};
