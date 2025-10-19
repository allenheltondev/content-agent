import { useState, useCallback, useRef, useMemo } from 'react';
import { apiService } from '../services/ApiService';

/**
 * Optimistic resolution state for a suggestion
 */
export interface OptimisticResolution {
  suggestionId: string;
  action: 'accepted' | 'rejected' | 'deleted';
  timestamp: number;
  isOptimistic: boolean; // True until confirmed by server
  error?: string; // Set if server confirmation fails
  retryCount: number;
}

/**
 * Batch resolution request
 */
export interface BatchResolutionRequest {
  postId: string;
  resolutions: Array<{
    suggestionId: string;
    action: 'accepted' | 'rejected' | 'deleted';
  }>;
}

/**
 * Resolution queue item for batch processing
 */
interface ResolutionQueueItem {
  postId: string;
  suggestionId: string;
  action: 'accepted' | 'rejected' | 'deleted';
  timestamp: number;
  retryCount: number;
}

/**
 * Configuration for optimistic resolution
 */
export interface OptimisticResolutionConfig {
  batchDelay: number; // Delay before processing batch (ms)
  maxBatchSize: number; // Maximum items in a batch
  maxRetries: number; // Maximum retry attempts
  retryDelay: number; // Base delay between retries (ms)
  enableBatching: boolean; // Whether to batch requests
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: OptimisticResolutionConfig = {
  batchDelay: 500, // 500ms delay for batching
  maxBatchSize: 10, // Process up to 10 resolutions at once
  maxRetries: 3,
  retryDelay: 1000, // 1 second base retry delay
  enableBatching: true
};

/**
 * Hook for optimistic suggestion resolution with batching
 */
export function useOptimisticSuggestionResolution(
  config: Partial<OptimisticResolutionConfig> = {}
) {
  const resolvedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // State for tracking optimistic resolutions
  const [optimisticResolutions, setOptimisticResolutions] = useState<Map<string, OptimisticResolution>>(
    new Map()
  );

  // Queue for batching resolution requests
  const resolutionQueueRef = useRef<ResolutionQueueItem[]>([]);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingRef = useRef<boolean>(false);

  /**
   * Add optimistic resolution immediately for UI feedback
   */
  const addOptimisticResolution = useCallback((
    suggestionId: string,
    action: 'accepted' | 'rejected' | 'deleted'
  ) => {
    const resolution: OptimisticResolution = {
      suggestionId,
      action,
      timestamp: Date.now(),
      isOptimistic: true,
      retryCount: 0
    };

    setOptimisticResolutions(prev => new Map(prev.set(suggestionId, resolution)));
    return resolution;
  }, []);

  /**
   * Update optimistic resolution with server confirmation or error
   */
  const updateOptimisticResolution = useCallback((
    suggestionId: string,
    updates: Partial<OptimisticResolution>
  ) => {
    setOptimisticResolutions(prev => {
      const current = prev.get(suggestionId);
      if (!current) return prev;

      const updated = { ...current, ...updates };
      const newMap = new Map(prev);
      newMap.set(suggestionId, updated);
      return newMap;
    });
  }, []);

  /**
   * Remove optimistic resolution (when confirmed or permanently failed)
   */
  const removeOptimisticResolution = useCallback((suggestionId: string) => {
    setOptimisticResolutions(prev => {
      const newMap = new Map(prev);
      newMap.delete(suggestionId);
      return newMap;
    });
  }, []);

  /**
   * Process a single resolution request
   */
  const processSingleResolution = useCallback(async (
    postId: string,
    suggestionId: string,
    action: 'accepted' | 'rejected' | 'deleted'
  ): Promise<boolean> => {
    try {
      await apiService.updateSuggestionStatus(postId, suggestionId, action);
      return true;
    } catch (error) {
      console.error(`Failed to resolve suggestion ${suggestionId}:`, error);
      return false;
    }
  }, []);

  /**
   * Process batch of resolution requests
   */
  const processBatchResolutions = useCallback(async (items: ResolutionQueueItem[]) => {
    if (items.length === 0) return;

    // Group by postId for efficient processing
    const groupedByPost = items.reduce((acc, item) => {
      if (!acc[item.postId]) {
        acc[item.postId] = [];
      }
      acc[item.postId].push(item);
      return acc;
    }, {} as Record<string, ResolutionQueueItem[]>);

    // Process each post's resolutions
    for (const [_postId, postItems] of Object.entries(groupedByPost)) {
      const results = await Promise.allSettled(
        postItems.map(item =>
          processSingleResolution(item.postId, item.suggestionId, item.action)
        )
      );

      // Update optimistic resolutions based on results
      postItems.forEach((item, index) => {
        const result = results[index];

        if (result.status === 'fulfilled' && result.value) {
          // Success - mark as confirmed and remove after brief delay
          updateOptimisticResolution(item.suggestionId, {
            isOptimistic: false,
            error: undefined
          });

          setTimeout(() => {
            removeOptimisticResolution(item.suggestionId);
          }, 1000); // Keep success state visible for 1 second
        } else {
          // Failed - update with error and potentially retry
          const error = result.status === 'rejected' ? result.reason?.message : 'Unknown error';

          if (item.retryCount < resolvedConfig.maxRetries) {
            // Schedule retry
            const retryItem = {
              ...item,
              retryCount: item.retryCount + 1,
              timestamp: Date.now() + resolvedConfig.retryDelay * Math.pow(2, item.retryCount)
            };

            setTimeout(() => {
              resolutionQueueRef.current.push(retryItem);
              scheduleProcessing();
            }, resolvedConfig.retryDelay * Math.pow(2, item.retryCount));

            updateOptimisticResolution(item.suggestionId, {
              error: `Retrying... (${item.retryCount + 1}/${resolvedConfig.maxRetries})`,
              retryCount: item.retryCount + 1
            });
          } else {
            // Max retries exceeded - mark as permanently failed
            updateOptimisticResolution(item.suggestionId, {
              error: `Failed after ${resolvedConfig.maxRetries} attempts: ${error}`,
              isOptimistic: false
            });
          }
        }
      });
    }
  }, [processSingleResolution, updateOptimisticResolution, removeOptimisticResolution, resolvedConfig]);

  /**
   * Schedule batch processing
   */
  const scheduleProcessing = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    batchTimeoutRef.current = setTimeout(async () => {
      if (processingRef.current || resolutionQueueRef.current.length === 0) {
        return;
      }

      processingRef.current = true;

      try {
        // Take items from queue for processing
        const itemsToProcess = resolutionQueueRef.current.splice(0, resolvedConfig.maxBatchSize);
        await processBatchResolutions(itemsToProcess);
      } finally {
        processingRef.current = false;

        // Schedule next batch if queue has more items
        if (resolutionQueueRef.current.length > 0) {
          scheduleProcessing();
        }
      }
    }, resolvedConfig.batchDelay);
  }, [processBatchResolutions, resolvedConfig]);

  /**
   * Queue a suggestion resolution for processing
   */
  const queueResolution = useCallback((
    postId: string,
    suggestionId: string,
    action: 'accepted' | 'rejected' | 'deleted'
  ) => {
    // Add to queue
    const queueItem: ResolutionQueueItem = {
      postId,
      suggestionId,
      action,
      timestamp: Date.now(),
      retryCount: 0
    };

    resolutionQueueRef.current.push(queueItem);

    // Schedule processing if batching is enabled
    if (resolvedConfig.enableBatching) {
      scheduleProcessing();
    } else {
      // Process immediately if batching is disabled
      processBatchResolutions([queueItem]);
    }
  }, [scheduleProcessing, processBatchResolutions, resolvedConfig.enableBatching]);

  /**
   * Resolve a suggestion with optimistic UI updates
   */
  const resolveSuggestion = useCallback((
    postId: string,
    suggestionId: string,
    action: 'accepted' | 'rejected' | 'deleted'
  ) => {
    // Add optimistic resolution for immediate UI feedback
    addOptimisticResolution(suggestionId, action);

    // Queue for actual processing
    queueResolution(postId, suggestionId, action);
  }, [addOptimisticResolution, queueResolution]);

  /**
   * Batch resolve multiple suggestions
   */
  const batchResolveSuggestions = useCallback((
    postId: string,
    resolutions: Array<{ suggestionId: string; action: 'accepted' | 'rejected' | 'deleted' }>
  ) => {
    // Add all optimistic resolutions immediately
    resolutions.forEach(({ suggestionId, action }) => {
      addOptimisticResolution(suggestionId, action);
    });

    // Queue all for processing
    resolutions.forEach(({ suggestionId, action }) => {
      queueResolution(postId, suggestionId, action);
    });
  }, [addOptimisticResolution, queueResolution]);

  /**
   * Check if a suggestion is optimistically resolved
   */
  const isOptimisticallyResolved = useCallback((suggestionId: string): boolean => {
    return optimisticResolutions.has(suggestionId);
  }, [optimisticResolutions]);

  /**
   * Get optimistic resolution for a suggestion
   */
  const getOptimisticResolution = useCallback((suggestionId: string): OptimisticResolution | undefined => {
    return optimisticResolutions.get(suggestionId);
  }, [optimisticResolutions]);

  /**
   * Get all optimistic resolutions
   */
  const getAllOptimisticResolutions = useCallback((): OptimisticResolution[] => {
    return Array.from(optimisticResolutions.values());
  }, [optimisticResolutions]);

  /**
   * Clear all optimistic resolutions (useful for cleanup)
   */
  const clearOptimisticResolutions = useCallback(() => {
    setOptimisticResolutions(new Map());
    resolutionQueueRef.current = [];

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, []);

  /**
   * Get queue statistics
   */
  const getQueueStats = useCallback(() => {
    return {
      queueLength: resolutionQueueRef.current.length,
      optimisticCount: optimisticResolutions.size,
      isProcessing: processingRef.current,
      failedCount: Array.from(optimisticResolutions.values()).filter(r => r.error && !r.isOptimistic).length
    };
  }, [optimisticResolutions]);

  return {
    // Core resolution functions
    resolveSuggestion,
    batchResolveSuggestions,

    // State queries
    isOptimisticallyResolved,
    getOptimisticResolution,
    getAllOptimisticResolutions,

    // Management functions
    clearOptimisticResolutions,
    getQueueStats,

    // Direct state access (for advanced use cases)
    optimisticResolutions: Array.from(optimisticResolutions.values())
  };
}
