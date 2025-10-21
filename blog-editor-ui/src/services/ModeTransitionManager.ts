import type { Suggestion } from '../types';
import { suggestionRecalculationService } from './SuggestionRecalculationService';

/**
 * Progress information for mode transitions
 */
export interface TransitionProgress {
  phase: 'starting' | 'recalculating' | 'updating' | 'completing' | 'error';
  message: string;
  progress: number; // 0-100
  canCancel: boolean;
}

/**
 * Result of a mode transition
 */
export interface TransitionResult {
  success: boolean;
  updatedSuggestions?: Suggestion[];
  error?: string;
  requiresUserAction?: boolean;
  retryable?: boolean;
}

/**
 * Configuration for transition behavior
 */
export interface TransitionConfig {
  enableAnimations: boolean;
  animationDuration: number;
  enableRetry: boolean;
  maxRetryAttempts: number;
  retryDelay: number;
  enableProgressReporting: boolean;
  enableCancellation: boolean;
  debounceDelay: number;
  enableCaching: boolean;
  cacheSize: number;
}

/**
 * Default transition configuration
 */
const DEFAULT_CONFIG: TransitionConfig = {
  enableAnimations: true,
  animationDuration: 300, // 300ms
  enableRetry: true,
  maxRetryAttempts: 3,
  retryDelay: 1000, // 1 second
  enableProgressReporting: true,
  enableCancellation: false, // Mode transitions are generally not cancellable
  debounceDelay: 250, // 250ms debounce for rapid transitions
  enableCaching: true,
  cacheSize: 10
};

/**
 * Manager for coordinating smooth transitions between editor modes
 */
export class ModeTransitionManager {
  private config: TransitionConfig;
  private currentTransition: Promise<TransitionResult> | null = null;
  private transitionAbortController: AbortController | null = null;
  private progressCallbacks: Set<(progress: TransitionProgress) => void> = new Set();
  private retryCount = 0;
  private debounceTimer: NodeJS.Timeout | null = null;
  private transitionCache = new Map<string, { result: TransitionResult; timestamp: number }>();
  private lastTransitionKey: string | null = null;

  constructor(config: Partial<TransitionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Begin a transition between modes with debouncing and caching
   */
  async beginTransition(
    fromMode: 'edit' | 'review',
    toMode: 'edit' | 'review',
    context: {
      content?: string;
      contentAtLastReview?: string;
      currentSuggestions?: Suggestion[];
      postId?: string;
      onSuggestionRecalculation?: (content: string, suggestions: Suggestion[]) => Promise<Suggestion[]>;
    }
  ): Promise<TransitionResult> {
    // Generate cache key for this transition
    const transitionKey = this.generateTransitionKey(fromMode, toMode, context);

    // Check cache first if enabled
    if (this.config.enableCaching) {
      const cached = this.getCachedResult(transitionKey);
      if (cached) {
        return cached;
      }
    }

    // Debounce rapid transitions
    if (this.config.debounceDelay > 0) {
      return new Promise((resolve, reject) => {
        // Clear existing debounce timer
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(async () => {
          try {
            const result = await this.executeTransitionInternal(fromMode, toMode, context);

            // Cache the result if enabled
            if (this.config.enableCaching) {
              this.cacheResult(transitionKey, result);
            }

            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, this.config.debounceDelay);
      });
    }

    // Execute immediately if debouncing is disabled
    const result = await this.executeTransitionInternal(fromMode, toMode, context);

    // Cache the result if enabled
    if (this.config.enableCaching) {
      this.cacheResult(transitionKey, result);
    }

    return result;
  }

  /**
   * Generate a cache key for transition results
   */
  private generateTransitionKey(
    fromMode: 'edit' | 'review',
    toMode: 'edit' | 'review',
    context: {
      content?: string;
      contentAtLastReview?: string;
      currentSuggestions?: Suggestion[];
      postId?: string;
    }
  ): string {
    const contentHash = this.hashString(context.content || '');
    const lastReviewHash = this.hashString(context.contentAtLastReview || '');
    const suggestionsHash = this.hashString(JSON.stringify(context.currentSuggestions?.map(s => s.id) || []));

    return `${fromMode}-${toMode}-${context.postId || 'no-post'}-${contentHash}-${lastReviewHash}-${suggestionsHash}`;
  }

  /**
   * Simple string hashing for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached transition result if available and not expired
   */
  private getCachedResult(key: string): TransitionResult | null {
    const cached = this.transitionCache.get(key);
    if (!cached) return null;

    // Check if cache entry has expired (5 minutes)
    const maxAge = 5 * 60 * 1000;
    if (Date.now() - cached.timestamp > maxAge) {
      this.transitionCache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache a transition result
   */
  private cacheResult(key: string, result: TransitionResult): void {
    // Only cache successful results
    if (!result.success) return;

    // Evict oldest entries if cache is full
    while (this.transitionCache.size >= this.config.cacheSize) {
      const firstKey = this.transitionCache.keys().next().value;
      this.transitionCache.delete(firstKey);
    }

    this.transitionCache.set(key, {
      result: { ...result }, // Deep copy
      timestamp: Date.now()
    });
  }

  /**
   * Internal transition execution without debouncing
   */
  private async executeTransitionInternal(
    fromMode: 'edit' | 'review',
    toMode: 'edit' | 'review',
    context: {
      content?: string;
      contentAtLastReview?: string;
      currentSuggestions?: Suggestion[];
      postId?: string;
      onSuggestionRecalculation?: (content: string, suggestions: Suggestion[]) => Promise<Suggestion[]>;
    }
  ): Promise<TransitionResult> {
    // Prevent concurrent transitions
    if (this.currentTransition) {
      throw new Error('Another transition is already in progress');
    }

    // Reset retry count for new transition
    this.retryCount = 0;

    // Create abort controller for cancellation support
    if (this.config.enableCancellation) {
      this.transitionAbortController = new AbortController();
    }

    try {
      this.currentTransition = this.executeTransition(fromMode, toMode, context);
      return await this.currentTransition;
    } finally {
      this.currentTransition = null;
      this.transitionAbortController = null;
    }
  }

  /**
   * Execute the actual transition logic
   */
  private async executeTransition(
    fromMode: 'edit' | 'review',
    toMode: 'edit' | 'review',
    context: {
      content?: string;
      contentAtLastReview?: string;
      currentSuggestions?: Suggestion[];
      postId?: string;
      onSuggestionRecalculation?: (content: string, suggestions: Suggestion[]) => Promise<Suggestion[]>;
    }
  ): Promise<TransitionResult> {
    try {
      // Report starting phase
      this.reportProgress({
        phase: 'starting',
        message: `Switching from ${fromMode} to ${toMode} mode...`,
        progress: 0,
        canCancel: this.config.enableCancellation
      });

      // Add animation delay if enabled
      if (this.config.enableAnimations) {
        await this.delay(50); // Small delay to allow UI to update
      }

      // Handle specific transition types
      if (fromMode === 'edit' && toMode === 'review') {
        return await this.handleEditToReview(context);
      } else if (fromMode === 'review' && toMode === 'edit') {
        return await this.handleReviewToEdit(context);
      } else {
        // Same mode transition - just complete successfully
        this.reportProgress({
          phase: 'completing',
          message: 'Transition completed',
          progress: 100,
          canCancel: false
        });
        return { success: true };
      }
    } catch (error) {
      console.error('Transition failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      this.reportProgress({
        phase: 'error',
        message: `Transition failed: ${errorMessage}`,
        progress: 0,
        canCancel: false
      });

      // Check if this is a retryable error and we haven't exceeded retry limit
      const isRetryable = this.isRetryableError(error);
      if (isRetryable && this.config.enableRetry && this.retryCount < this.config.maxRetryAttempts) {
        return {
          success: false,
          error: errorMessage,
          requiresUserAction: false,
          retryable: true
        };
      }

      return {
        success: false,
        error: errorMessage,
        requiresUserAction: true,
        retryable: isRetryable && this.config.enableRetry
      };
    }
  }

  /**
   * Handle transition from Edit to Review mode
   */
  async handleEditToReview(context: {
    content?: string;
    contentAtLastReview?: string;
    currentSuggestions?: Suggestion[];
    postId?: string;
    onSuggestionRecalculation?: (content: string, suggestions: Suggestion[]) => Promise<Suggestion[]>;
  }): Promise<TransitionResult> {
    const { content, contentAtLastReview, currentSuggestions = [], postId, onSuggestionRecalculation } = context;

    // Check if we need to recalculate suggestions
    const needsRecalculation = content && contentAtLastReview && content !== contentAtLastReview;

    if (needsRecalculation && postId) {
      this.reportProgress({
        phase: 'recalculating',
        message: 'Recalculating suggestions based on content changes...',
        progress: 25,
        canCancel: this.config.enableCancellation
      });

      try {
        // Check for cancellation
        this.checkCancellation();

        // Perform suggestion recalculation
        const recalculationResult = await suggestionRecalculationService.performRecalculation(
          contentAtLastReview,
          content,
          currentSuggestions,
          postId
        );

        this.reportProgress({
          phase: 'updating',
          message: 'Updating suggestions...',
          progress: 75,
          canCancel: false
        });

        // Check for cancellation
        this.checkCancellation();

        // Trigger callback with recalculated suggestions if provided
        let finalSuggestions = recalculationResult.updatedSuggestions;
        if (onSuggestionRecalculation) {
          finalSuggestions = await onSuggestionRecalculation(content, recalculationResult.updatedSuggestions);
        }

        this.reportProgress({
          phase: 'completing',
          message: 'Transition to Review mode completed',
          progress: 100,
          canCancel: false
        });

        return {
          success: true,
          updatedSuggestions: finalSuggestions
        };
      } catch (error) {
        console.error('Suggestion recalculation failed during transition:', error);

        // Implement fallback behavior based on error type
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isNetworkError = errorMessage.toLowerCase().includes('network') ||
                              errorMessage.toLowerCase().includes('fetch') ||
                              errorMessage.toLowerCase().includes('timeout');

        if (isNetworkError) {
          // Network errors - suggest fallback mode
          this.reportProgress({
            phase: 'completing',
            message: 'Switched to Review mode (working offline)',
            progress: 100,
            canCancel: false
          });

          return {
            success: true,
            error: 'Network unavailable - working in offline mode with existing suggestions',
            requiresUserAction: false,
            retryable: true
          };
        } else {
          // Other errors - still allow mode switch but with degraded functionality
          this.reportProgress({
            phase: 'completing',
            message: 'Switched to Review mode (limited functionality)',
            progress: 100,
            canCancel: false
          });

          return {
            success: true,
            error: 'Suggestion update failed - you can continue reviewing existing suggestions',
            requiresUserAction: false,
            retryable: true
          };
        }
      }
    } else {
      // No recalculation needed - simple mode switch
      this.reportProgress({
        phase: 'completing',
        message: 'Switched to Review mode',
        progress: 100,
        canCancel: false
      });

      return { success: true };
    }
  }

  /**
   * Handle transition from Review to Edit mode
   */
  async handleReviewToEdit(context: {
    content?: string;
    contentAtLastReview?: string;
    currentSuggestions?: Suggestion[];
    postId?: string;
    onSuggestionRecalculation?: (content: string, suggestions: Suggestion[]) => Promise<Suggestion[]>;
  }): Promise<TransitionResult> {
    // Review to Edit is typically simpler - no recalculation needed
    this.reportProgress({
      phase: 'completing',
      message: 'Switched to Edit mode',
      progress: 100,
      canCancel: false
    });

    // Add animation delay if enabled
    if (this.config.enableAnimations) {
      await this.delay(this.config.animationDuration / 2);
    }

    return { success: true };
  }

  /**
   * Retry a failed transition
   */
  async retryTransition(
    fromMode: 'edit' | 'review',
    toMode: 'edit' | 'review',
    context: {
      content?: string;
      contentAtLastReview?: string;
      currentSuggestions?: Suggestion[];
      postId?: string;
      onSuggestionRecalculation?: (content: string, suggestions: Suggestion[]) => Promise<Suggestion[]>;
    }
  ): Promise<TransitionResult> {
    if (!this.config.enableRetry) {
      throw new Error('Retry is not enabled');
    }

    if (this.retryCount >= this.config.maxRetryAttempts) {
      throw new Error('Maximum retry attempts exceeded');
    }

    this.retryCount++;

    // Add retry delay
    if (this.config.retryDelay > 0) {
      this.reportProgress({
        phase: 'starting',
        message: `Retrying transition (attempt ${this.retryCount}/${this.config.maxRetryAttempts})...`,
        progress: 0,
        canCancel: false
      });

      await this.delay(this.config.retryDelay);
    }

    return this.executeTransition(fromMode, toMode, context);
  }

  /**
   * Cancel the current transition if supported
   */
  cancelTransition(): boolean {
    if (!this.config.enableCancellation || !this.transitionAbortController) {
      return false;
    }

    this.transitionAbortController.abort();

    this.reportProgress({
      phase: 'error',
      message: 'Transition cancelled by user',
      progress: 0,
      canCancel: false
    });

    return true;
  }

  /**
   * Check if the current transition has been cancelled
   */
  private checkCancellation(): void {
    if (this.transitionAbortController?.signal.aborted) {
      throw new Error('Transition was cancelled');
    }
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors and timeouts are typically retryable
      const retryableMessages = [
        'network',
        'timeout',
        'connection',
        'fetch',
        'service unavailable',
        'internal server error'
      ];

      const errorMessage = error.message.toLowerCase();
      return retryableMessages.some(msg => errorMessage.includes(msg));
    }

    return false;
  }

  /**
   * Report transition progress to registered callbacks
   */
  private reportProgress(progress: TransitionProgress): void {
    if (!this.config.enableProgressReporting) {
      return;
    }

    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Progress callback error:', error);
      }
    });
  }

  /**
   * Subscribe to transition progress updates
   */
  onProgress(callback: (progress: TransitionProgress) => void): () => void {
    this.progressCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.progressCallbacks.delete(callback);
    };
  }

  /**
   * Get current transition progress
   */
  getTransitionProgress(): TransitionProgress | null {
    // This would need to be implemented with state tracking
    // For now, return null if no transition is active
    return this.currentTransition ? {
      phase: 'starting',
      message: 'Transition in progress...',
      progress: 0,
      canCancel: this.config.enableCancellation
    } : null;
  }

  /**
   * Check if a transition is currently in progress
   */
  isTransitioning(): boolean {
    return this.currentTransition !== null;
  }

  /**
   * Set transition loading state (for external coordination)
   */
  setTransitionLoading(loading: boolean): void {
    // This method is for external coordination
    // The actual loading state is managed internally
    if (loading && !this.currentTransition) {
      console.warn('setTransitionLoading(true) called but no transition is active');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TransitionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): TransitionConfig {
    return { ...this.config };
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the transition cache
   */
  clearCache(): void {
    this.transitionCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.transitionCache.size,
      maxSize: this.config.cacheSize,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }

  /**
   * Reset the transition manager state
   */
  reset(): void {
    if (this.currentTransition) {
      this.cancelTransition();
    }

    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.retryCount = 0;
    this.progressCallbacks.clear();
    this.clearCache();
  }
}

/**
 * Create a configured ModeTransitionManager instance
 */
export function createModeTransitionManager(
  config?: Partial<TransitionConfig>
): ModeTransitionManager {
  return new ModeTransitionManager(config);
}

/**
 * Default mode transition manager instance
 */
export const modeTransitionManager = createModeTransitionManager();
