import type {
  BlogPost,
  Suggestion,
  CreatePostRequest,
  UpdatePostRequest,
  PostListResponse,
  SuggestionsResponse,
  SubmitReviewRequest,
  FinalizeRequest,
  ApiError,
  ApiServiceConfig,
  UserProfile,
  CreateProfileRequest,
  UpdateProfileRequest,
  ProfileResponse
} from '../types';

/**
 * HTTP methods supported by the API service
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

/**
 * Request configuration for API calls
 */
interface RequestConfig {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

/**
 * Retry configuration for failed requests
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatuses: number[];
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

/*
 service class for handling all backend communication
 * Includes JWT token injection, error handling, and retry logic
 */
export class ApiService {
  private baseUrl: string;
  private getAuthToken: () => Promise<string>;
  private retryConfig: RetryConfig;

  constructor(config: ApiServiceConfig, retryConfig: Partial<RetryConfig> = {}) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.getAuthToken = config.getAuthToken;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelay);
  }

  /**
   * Check if a status code is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return this.retryConfig.retryableStatuses.includes(status);
  }

  /**
   * Create request headers with authentication
   */
  private async createHeaders(additionalHeaders: Record<string, string> = {}): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...additionalHeaders
    };

    try {
      const token = await this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      // Continue without token - let the server handle authentication errors
    }

    return headers;
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    config: Omit<RequestConfig, 'headers'> & { headers?: Record<string, string> }
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryConfig.maxRetries + 1; attempt++) {
      try {
        const headers = await this.createHeaders(config.headers);

        const response = await fetch(url, {
          ...config,
          headers
        });

        // Handle successful responses
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            return await response.json();
          }
          // For non-JSON responses, return empty object
          return {} as T;
        }

        // Handle client errors (4xx) - don't retry
        if (response.status >= 400 && response.status < 500) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

          try {
            const errorBody = await response.json();
            errorMessage = errorBody.error || errorBody.message || errorMessage;
          } catch {
            // Ignore JSON parsing errors for error responses
          }

          const apiError: ApiError = {
            message: errorMessage,
            status: response.status,
            code: response.status.toString()
          };
          throw apiError;
        }

        // Handle server errors (5xx) - retry if configured
        if (this.isRetryableStatus(response.status) && attempt <= this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.warn(`Request failed with status ${response.status}, retrying in ${delay}ms (attempt ${attempt}/${this.retryConfig.maxRetries})`);
          await this.sleep(delay);
          continue;
        }

        // Final server error without retry
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorBody = await response.json();
          errorMessage = errorBody.error || errorBody.message || errorMessage;
        } catch {
          // Ignore JSON parsing errors
        }

        const apiError: ApiError = {
          message: errorMessage,
          status: response.status,
          code: response.status.toString()
        };
        throw apiError;

      } catch (error) {
        lastError = error as Error;

        // Don't retry for network errors on the last attempt
        if (attempt > this.retryConfig.maxRetries) {
          break;
        }

        // Don't retry API errors (they have status codes)
        if (error && typeof error === 'object' && 'status' in error) {
          throw error;
        }

        // Retry network errors
        const delay = this.calculateDelay(attempt);
        console.warn(`Network error, retrying in ${delay}ms (attempt ${attempt}/${this.retryConfig.maxRetries}):`, error);
        await this.sleep(delay);
      }
    }

    // If we get here, all retries failed
    const apiError: ApiError = {
      message: lastError?.message || 'Network request failed after retries',
      code: 'NETWORK_ERROR'
    };
    throw apiError;
  }

  /**
   * GET request helper
   */
  private async get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'GET', signal });
  }

  /**
   * POST request helper
   */
  private async post<T>(endpoint: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      signal
    });
  }

  /**
   * PUT request helper
   */
  private async put<T>(endpoint: string, data?: unknown, signal?: AbortSignal): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      signal
    });
  }

  /**
   * DELETE request helper
   */
  private async delete<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE', signal });
  }

  // Public API methods

  /**
   * Get all blog posts for the authenticated user
   */
  async getPosts(signal?: AbortSignal): Promise<BlogPost[]> {
    const response = await this.get<PostListResponse | BlogPost[]>('/api/posts', signal);

    // Handle both response formats: { posts: BlogPost[] } or BlogPost[]
    if (Array.isArray(response)) {
      return response;
    }

    return response.posts || [];
  }

  /**
   * Get a specific blog post by ID
   */
  async getPost(id: string, signal?: AbortSignal): Promise<BlogPost> {
    if (!id) {
      throw new Error('Post ID is required');
    }
    return this.get<BlogPost>(`/api/posts/${encodeURIComponent(id)}`, signal);
  }

  /**
   * Create a new blog post
   */
  async createPost(post: CreatePostRequest, signal?: AbortSignal): Promise<BlogPost> {
    return this.post<BlogPost>('/api/posts', post, signal);
  }

  /**
   * Update an existing blog post
   */
  async updatePost(id: string, post: UpdatePostRequest, signal?: AbortSignal): Promise<BlogPost> {
    if (!id) {
      throw new Error('Post ID is required');
    }
    return this.put<BlogPost>(`/api/posts/${encodeURIComponent(id)}`, post, signal);
  }

  /**
   * Get suggestions for a specific blog post
   */
  async getSuggestions(postId: string, signal?: AbortSignal): Promise<Suggestion[]> {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    const response = await this.get<SuggestionsResponse>(`/api/posts/${encodeURIComponent(postId)}/suggestions`, signal);
    return response.suggestions || [];
  }

  /**
   * Delete a specific suggestion
   */
  async deleteSuggestion(suggestionId: string, signal?: AbortSignal): Promise<void> {
    if (!suggestionId) {
      throw new Error('Suggestion ID is required');
    }
    await this.delete<void>(`/api/suggestions/${encodeURIComponent(suggestionId)}`, signal);
  }

  /**
   * Submit a post for additional review
   */
  async submitForReview(postId: string, signal?: AbortSignal): Promise<void> {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    const request: SubmitReviewRequest = { postId };
    await this.post<void>(`/api/posts/${encodeURIComponent(postId)}/submit-review`, request, signal);
  }

  /**
   * Finalize a draft post
   */
  async finalizeDraft(postId: string, signal?: AbortSignal): Promise<void> {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    const request: FinalizeRequest = { postId };
    await this.post<void>(`/api/posts/${encodeURIComponent(postId)}/finalize`, request, signal);
  }

  // Profile API methods

  /**
   * Create a new user profile during initial setup
   */
  async createProfile(profileData: CreateProfileRequest, signal?: AbortSignal): Promise<UserProfile> {
    if (!profileData.writingTone || !profileData.writingStyle) {
      throw new Error('Writing tone and style are required');
    }
    if (!profileData.topics || profileData.topics.length === 0) {
      throw new Error('At least one topic is required');
    }
    if (!profileData.skillLevel) {
      throw new Error('Skill level is required');
    }

    const response = await this.post<ProfileResponse>('/api/profile', profileData, signal);
    return response.profile;
  }

  /**
   * Update an existing user profile
   */
  async updateProfile(profileData: UpdateProfileRequest, signal?: AbortSignal): Promise<UserProfile> {
    // Validate that at least one field is being updated
    const hasUpdates = Object.values(profileData).some(value =>
      value !== undefined && value !== null &&
      (Array.isArray(value) ? value.length > 0 : true)
    );

    if (!hasUpdates) {
      throw new Error('At least one profile field must be updated');
    }

    const response = await this.put<ProfileResponse>('/api/profile', profileData, signal);
    return response.profile;
  }

  /**
   * Get the current user's profile
   */
  async getProfile(signal?: AbortSignal): Promise<UserProfile> {
    const response = await this.get<ProfileResponse>('/api/profile', signal);
    return response.profile;
  }
}

/**
 * Create a configured ApiService instance
 */
export function createApiService(config: ApiServiceConfig): ApiService {
  return new ApiService(config);
}

/**
 * Default API service instance (to be configured by the application)
 */
export let apiService: ApiService;

/**
 * Initialize the default API service instance
 */
export function initializeApiService(config: ApiServiceConfig): void {
  apiService = createApiService(config);
}
