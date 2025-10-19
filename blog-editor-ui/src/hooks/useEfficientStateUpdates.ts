import { useCallback, useRef, useMemo } from 'react';

/**
 * State update operation
 */
interface StateUpdateOperation<T> {
  id: string;
  updater: (prevState: T) => T;
  priority: 'high' | 'normal' | 'low';
  timestamp: number;
}

/**
 * Batching configuration
 */
interface BatchingConfig {
  enabled: boolean;
  delay: number; // Delay in milliseconds
  maxBatchSize: number;
  priorityThresholds: {
    high: number; // Max delay for high priority updates
    normal: number; // Max delay for normal priority updates
    low: number; // Max delay for low priority updates
  };
}

/**
 * Default batching configuration
 */
const DEFAULT_BATCHING_CONFIG: BatchingConfig = {
  enabled: true,
  delay: 16, // ~60fps
  maxBatchSize: 50,
  priorityThresholds: {
    high: 0, // Immediate
    normal: 16, // Next frame
    low: 100 // 100ms delay
  }
};

/**
 * Hook for efficient state updates with batching and deduplication
 */
export function useEfficientStateUpdates<T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  config: Partial<BatchingConfig> = {}
) {
  const resolvedConfig = useMemo(() => ({ ...DEFAULT_BATCHING_CONFIG, ...config }), [config]);

  // Queue for pending updates
  const updateQueueRef = useRef<StateUpdateOperation<T>[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateIdRef = useRef<string | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  /**
   * Process batched updates
   */
  const processBatchedUpdates = useCallback(() => {
    if (isProcessingRef.current || updateQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;

    try {
      // Sort updates by priority and timestamp
      const sortedUpdates = [...updateQueueRef.current].sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return a.timestamp - b.timestamp;
      });

      // Take up to maxBatchSize updates
      const updatesToProcess = sortedUpdates.slice(0, resolvedConfig.maxBatchSize);

      // Remove processed updates from queue
      updateQueueRef.current = updateQueueRef.current.filter(
        update => !updatesToProcess.includes(update)
      );

      // Apply all updates in a single setState call
      setState(prevState => {
        let newState = prevState;

        updatesToProcess.forEach(update => {
          try {
            newState = update.updater(newState);
          } catch (error) {
            console.error(`Error applying state update ${update.id}:`, error);
          }
        });

        return newState;
      });

      // Track last update for deduplication
      if (updatesToProcess.length > 0) {
        lastUpdateIdRef.current = updatesToProcess[updatesToProcess.length - 1].id;
      }

    } finally {
      isProcessingRef.current = false;

      // Schedule next batch if there are more updates
      if (updateQueueRef.current.length > 0) {
        scheduleNextBatch();
      }
    }
  }, [setState, resolvedConfig.maxBatchSize]);

  /**
   * Schedule next batch processing
   */
  const scheduleNextBatch = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Find the highest priority update to determine delay
    const highestPriority = updateQueueRef.current.reduce((highest, update) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[update.priority] < priorityOrder[highest] ? update.priority : highest;
    }, 'low' as 'high' | 'normal' | 'low');

    const delay = resolvedConfig.priorityThresholds[highestPriority];

    batchTimeoutRef.current = setTimeout(processBatchedUpdates, delay);
  }, [processBatchedUpdates, resolvedConfig.priorityThresholds]);

  /**
   * Queue a state update
   */
  const queueUpdate = useCallback((
    updater: (prevState: T) => T,
    options: {
      id?: string;
      priority?: 'high' | 'normal' | 'low';
      deduplicate?: boolean;
    } = {}
  ) => {
    const {
      id = `update_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      priority = 'normal',
      deduplicate = true
    } = options;

    // Deduplication: remove existing update with same ID
    if (deduplicate) {
      updateQueueRef.current = updateQueueRef.current.filter(update => update.id !== id);
    }

    const updateOperation: StateUpdateOperation<T> = {
      id,
      updater,
      priority,
      timestamp: Date.now()
    };

    updateQueueRef.current.push(updateOperation);

    if (resolvedConfig.enabled) {
      // Schedule batch processing
      scheduleNextBatch();
    } else {
      // Process immediately if batching is disabled
      processBatchedUpdates();
    }
  }, [resolvedConfig.enabled, scheduleNextBatch, processBatchedUpdates]);

  /**
   * Update state immediately (bypasses batching)
   */
  const updateImmediately = useCallback((updater: (prevState: T) => T) => {
    setState(updater);
  }, [setState]);

  /**
   * Flush all pending updates immediately
   */
  const flushUpdates = useCallback(() => {
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    processBatchedUpdates();
  }, [processBatchedUpdates]);

  /**
   * Clear all pending updates
   */
  const clearPendingUpdates = useCallback(() => {
    updateQueueRef.current = [];

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, []);

  /**
   * Get queue statistics
   */
  const getQueueStats = useCallback(() => {
    const queue = updateQueueRef.current;

    return {
      totalPending: queue.length,
      byPriority: {
        high: queue.filter(u => u.priority === 'high').length,
        normal: queue.filter(u => u.priority === 'normal').length,
        low: queue.filter(u => u.priority === 'low').length
      },
      isProcessing: isProcessingRef.current,
      lastUpdateId: lastUpdateIdRef.current
    };
  }, []);

  /**
   * Create a memoized updater for specific operations
   */
  const createMemoizedUpdater = useCallback(<K extends keyof T>(
    key: K,
    transform: (value: T[K]) => T[K]
  ) => {
    return (prevState: T): T => {
      const currentValue = prevState[key];
      const newValue = transform(currentValue);

      // Only update if value actually changed
      if (currentValue === newValue) {
        return prevState;
      }

      return {
        ...prevState,
        [key]: newValue
      };
    };
  }, []);

  /**
   * Batch multiple updates together
   */
  const batchUpdates = useCallback((
    updates: Array<{
      updater: (prevState: T) => T;
      id?: string;
      priority?: 'high' | 'normal' | 'low';
    }>
  ) => {
    // Create a single combined updater
    const combinedUpdater = (prevState: T): T => {
      return updates.reduce((state, { updater }) => {
        try {
          return updater(state);
        } catch (error) {
          console.error('Error in batched update:', error);
          return state;
        }
      }, prevState);
    };

    // Find highest priority among updates
    const highestPriority = updates.reduce((highest, update) => {
      const priority = update.priority || 'normal';
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[priority] < priorityOrder[highest] ? priority : highest;
    }, 'low' as 'high' | 'normal' | 'low');

    queueUpdate(combinedUpdater, {
      id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      priority: highestPriority,
      deduplicate: false
    });
  }, [queueUpdate]);

  // Cleanup on unmount
  useCallback(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Core update functions
    queueUpdate,
    updateImmediately,
    batchUpdates,

    // Utility functions
    createMemoizedUpdater,

    // Queue management
    flushUpdates,
    clearPendingUpdates,
    getQueueStats,

    // Configuration
    config: resolvedConfig
  };
}
