import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import type { Suggestion } from '../types';


/**
 * Suggestion resolution action
 */
export interface SuggestionResolutionAction {
  id: string;
  suggestionId: string;
  action: 'accept' | 'reject' | 'edit';
  editedText?: string;
  timestamp: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  error?: string;
}

/**
 * Batch resolution request
 */
export interface BatchResolutionRequest {
  actions: SuggestionResolutionAction[];
  batchId: string;
  timestamp: number;
  priority: 'high' | 'normal' | 'low';
}

/**
 * Resolution state for optimistic updates
 */
export interface OptimisticResolutionState {
  resolvedSuggestions: Map<string, SuggestionResolutionAction>;
  pendingActions: Map<string, SuggestionResolutionAction>;
  failedActions: Map<string, SuggestionResolutionAction>;
  batchQueue: BatchResolutionRequest[];
}

/**
 * Configuration for suggestion resolution manager
 */
export interface SuggestionResolutionConfig {
  /**
   * Whether to enable optimistic UI updates
   */
  enableOptimisticUpdates?: boolean;

  /**
   * Whether to enable batch processing
   */
  enableBatchProcessing?: boolean;

  /**
   * Batch size for processing multiple resolutions
   */
  batchSize?: number;

  /**
   * Batch processing delay (ms)
   */
  batchDelay?: number;

  /**
   * Maximum retry attempts for failed resolutions
   */
  maxRetries?: number;

  /**
   * Retry delay multiplier
   */
  retryDelayMultiplier?: number;

  /**
   * Whether to enable automatic retry for failed actions
   */
  enableAutoRetry?: boolean;

  /**
   * Whether to enable performance monitoring
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * Callback for successful resolution
   */
  onResolutionSuccess?: (action: SuggestionResolutionAction) => void;

  /**
   * Callback for failed resolution
   */
  onResolutionFailure?: (action: SuggestionResolutionAction, error: string) => void;

  /**
   * Callback for batch completion
   */
  onBatchComplete?: (batchId: string, results: SuggestionResolutionAction[]) => void;
}

/**
 * Resolution statistics
 */
export interface ResolutionStats {
  totalResolutions: number;
  successfulResolutions: number;
  failedResolutions: number;
  averageResolutionTime: number;
  batchesProcessed: number;
  retryCount: number;
  successRate: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<SuggestionResolutionConfig, 'onResolutionSuccess' | 'onResolutionFailure' | 'onBatchComplete'>> = {
  enableOptimisticUpdates: true,
  enableBatchProcessing: true,
  batchSize: 5,
  batchDelay: 500,
  maxRetries: 3,
  retryDelayMultiplier: 2,
  enableAutoRetry: true,
  enablePerformanceMonitoring: true
};

/**
 * Hook for managing efficient suggestion resolution with optimistic updates and batch processing
 */
export function useSuggestionResolutionManager(
  suggestions: Suggestion[],
  onAcceptSuggestion: (suggestionId: string, editedText?: string) => Promise<void>,
  onRejectSuggestion: (suggestionId: string) => Promise<void>,
  config: SuggestionResolutionConfig = {}
) {
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config]);

  // Performance monitoring removed

  // Resolution state
  const [state, setState] = useState<OptimisticResolutionState>({
    resolvedSuggestions: new Map(),
    pendingActions: new Map(),
    failedActions: new Map(),
    batchQueue: []
  });

  // Statistics
  const statsRef = useRef<ResolutionStats>({
    totalResolutions: 0,
    successfulResolutions: 0,
    failedResolutions: 0,
    averageResolutionTime: 0,
    batchesProcessed: 0,
    retryCount: 0,
    successRate: 0
  });

  // Batch processing timer
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingBatchRef = useRef<boolean>(false);

  /**
   * Generate unique action ID
   */
  const generateActionId = useCallback(() => {
    return `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * Generate unique batch ID
   */
  const generateBatchId = useCallback(() => {
    return `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  /**
   * Create a resolution action
   */
  const createResolutionAction = useCallback((
    suggestionId: string,
    action: 'accept' | 'reject' | 'edit',
    editedText?: string
  ): SuggestionResolutionAction => {
    return {
      id: generateActionId(),
      suggestionId,
      action,
      editedText,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };
  }, [generateActionId]);

  /**
   * Apply optimistic update
   */
  const applyOptimisticUpdate = useCallback((action: SuggestionResolutionAction) => {
    if (!finalConfig.enableOptimisticUpdates) return;

    setState(prev => {
      const newState = { ...prev };

      // Add to resolved suggestions for immediate UI feedback
      newState.resolvedSuggestions = new Map(prev.resolvedSuggestions);
      newState.resolvedSuggestions.set(action.suggestionId, action);

      // Add to pending actions for tracking
      newState.pendingActions = new Map(prev.pendingActions);
      newState.pendingActions.set(action.id, action);

      return newState;
    });
  }, [finalConfig.enableOptimisticUpdates]);

  /**
   * Revert optimistic update on failure
   */
  const revertOptimisticUpdate = useCallback((action: SuggestionResolutionAction) => {
    setState(prev => {
      const newState = { ...prev };

      // Remove from resolved suggestions
      newState.resolvedSuggestions = new Map(prev.resolvedSuggestions);
      newState.resolvedSuggestions.delete(action.suggestionId);

      // Move to failed actions
      newState.failedActions = new Map(prev.failedActions);
      newState.failedActions.set(action.id, { ...action, status: 'failed' });

      // Remove from pending
      newState.pendingActions = new Map(prev.pendingActions);
      newState.pendingActions.delete(action.id);

      return newState;
    });
  }, []);

  /**
   * Confirm optimistic update on success
   */
  const confirmOptimisticUpdate = useCallback((action: SuggestionResolutionAction) => {
    setState(prev => {
      const newState = { ...prev };

      // Update resolved suggestion status
      newState.resolvedSuggestions = new Map(prev.resolvedSuggestions);
      newState.resolvedSuggestions.set(action.suggestionId, { ...action, status: 'completed' });

      // Remove from pending
      newState.pendingActions = new Map(prev.pendingActions);
      newState.pendingActions.delete(action.id);

      return newState;
    });
  }, []);

  /**
   * Process a single resolution action
   */
  const processResolutionAction = useCallback(async (action: SuggestionResolutionAction): Promise<SuggestionResolutionAction> => {
      const startTime = Date.now();

      try {
        // Update action status to processing
        setState(prev => {
          const newPending = new Map(prev.pendingActions);
          newPending.set(action.id, { ...action, status: 'processing' });
          return { ...prev, pendingActions: newPending };
        });

        // Execute the actual resolution
        if (action.action === 'accept' || action.action === 'edit') {
          await onAcceptSuggestion(action.suggestionId, action.editedText);
        } else if (action.action === 'reject') {
          await onRejectSuggestion(action.suggestionId);
        }

        // Update statistics
        const duration = Date.now() - startTime;
        statsRef.current.totalResolutions++;
        statsRef.current.successfulResolutions++;
        statsRef.current.averageResolutionTime =
          (statsRef.current.averageResolutionTime * (statsRef.current.totalResolutions - 1) + duration) /
          statsRef.current.totalResolutions;
        statsRef.current.successRate =
          statsRef.current.successfulResolutions / statsRef.current.totalResolutions;

        const completedAction = { ...action, status: 'completed' as const };

        // Confirm optimistic update
        confirmOptimisticUpdate(completedAction);

        // Call success callback
        finalConfig.onResolutionSuccess?.(completedAction);

        return completedAction;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const failedAction = {
          ...action,
          status: 'failed' as const,
          error: errorMessage,
          retryCount: action.retryCount + 1
        };

        // Update statistics
        statsRef.current.totalResolutions++;
        statsRef.current.failedResolutions++;
        statsRef.current.successRate =
          statsRef.current.successfulResolutions / statsRef.current.totalResolutions;

        // Revert optimistic update
        revertOptimisticUpdate(failedAction);

        // Call failure callback
        finalConfig.onResolutionFailure?.(failedAction, errorMessage);

        // Schedule retry if enabled and within retry limit
        if (finalConfig.enableAutoRetry && failedAction.retryCount < finalConfig.maxRetries) {
          const retryDelay = finalConfig.batchDelay * Math.pow(finalConfig.retryDelayMultiplier, failedAction.retryCount);

          setTimeout(() => {
            scheduleResolution(failedAction.suggestionId, failedAction.action, failedAction.editedText);
            statsRef.current.retryCount++;
          }, retryDelay);
        }

        return failedAction;
      }
  }, [onAcceptSuggestion, onRejectSuggestion, confirmOptimisticUpdate, revertOptimisticUpdate, finalConfig]);

  /**
   * Process a batch of resolution actions
   */
  const processBatch = useCallback(async (batch: BatchResolutionRequest) => {
    if (processingBatchRef.current) return;

    processingBatchRef.current = true;

    try {
      const results = await Promise.allSettled(
        batch.actions.map(action => processResolutionAction(action))
      );

      const completedActions = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            ...batch.actions[index],
            status: 'failed' as const,
            error: result.reason?.message || 'Batch processing failed'
          };
        }
      });

      // Update statistics
      statsRef.current.batchesProcessed++;

      // Call batch completion callback
      finalConfig.onBatchComplete?.(batch.batchId, completedActions);

      // Remove processed batch from queue
      setState(prev => ({
        ...prev,
        batchQueue: prev.batchQueue.filter(b => b.batchId !== batch.batchId)
      }));
    } finally {
      processingBatchRef.current = false;
    }
  }, [processResolutionAction, finalConfig]);

  /**
   * Process batch queue
   */
  const processBatchQueue = useCallback(async () => {
    if (processingBatchRef.current || state.batchQueue.length === 0) return;

    // Sort batches by priority and timestamp
    const sortedBatches = [...state.batchQueue].sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });

    const nextBatch = sortedBatches[0];
    if (nextBatch) {
      await processBatch(nextBatch);
    }
  }, [state.batchQueue, processBatch]);

  /**
   * Schedule a resolution action
   */
  const scheduleResolution = useCallback((
    suggestionId: string,
    action: 'accept' | 'reject' | 'edit',
    editedText?: string,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ) => {
    const resolutionAction = createResolutionAction(suggestionId, action, editedText);

    // Apply optimistic update immediately
    applyOptimisticUpdate(resolutionAction);

    if (finalConfig.enableBatchProcessing) {
      // Add to batch queue
      setState(prev => {
        const newQueue = [...prev.batchQueue];

        // Find existing batch with same priority or create new one
        let targetBatch = newQueue.find(batch =>
          batch.priority === priority &&
          batch.actions.length < finalConfig.batchSize
        );

        if (!targetBatch) {
          targetBatch = {
            batchId: generateBatchId(),
            actions: [],
            timestamp: Date.now(),
            priority
          };
          newQueue.push(targetBatch);
        }

        targetBatch.actions.push(resolutionAction);

        return { ...prev, batchQueue: newQueue };
      });

      // Schedule batch processing
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }

      batchTimerRef.current = setTimeout(() => {
        processBatchQueue();
      }, finalConfig.batchDelay);
    } else {
      // Process immediately
      processResolutionAction(resolutionAction);
    }
  }, [createResolutionAction, applyOptimisticUpdate, finalConfig, generateBatchId, processBatchQueue, processResolutionAction]);

  /**
   * Accept a suggestion with optional editing
   */
  const acceptSuggestion = useCallback((suggestionId: string, editedText?: string) => {
    const action = editedText ? 'edit' : 'accept';
    scheduleResolution(suggestionId, action, editedText, 'normal');
  }, [scheduleResolution]);

  /**
   * Reject a suggestion
   */
  const rejectSuggestion = useCallback((suggestionId: string) => {
    scheduleResolution(suggestionId, 'reject', undefined, 'normal');
  }, [scheduleResolution]);

  /**
   * Batch accept multiple suggestions
   */
  const batchAcceptSuggestions = useCallback((suggestionIds: string[]) => {
    suggestionIds.forEach(suggestionId => {
      scheduleResolution(suggestionId, 'accept', undefined, 'high');
    });
  }, [scheduleResolution]);

  /**
   * Batch reject multiple suggestions
   */
  const batchRejectSuggestions = useCallback((suggestionIds: string[]) => {
    suggestionIds.forEach(suggestionId => {
      scheduleResolution(suggestionId, 'reject', undefined, 'high');
    });
  }, [scheduleResolution]);

  /**
   * Retry a failed action
   */
  const retryFailedAction = useCallback((actionId: string) => {
    const failedAction = state.failedActions.get(actionId);
    if (!failedAction) return;

    scheduleResolution(
      failedAction.suggestionId,
      failedAction.action,
      failedAction.editedText,
      'high'
    );

    // Remove from failed actions
    setState(prev => {
      const newFailed = new Map(prev.failedActions);
      newFailed.delete(actionId);
      return { ...prev, failedActions: newFailed };
    });
  }, [state.failedActions, scheduleResolution]);

  /**
   * Clear all failed actions
   */
  const clearFailedActions = useCallback(() => {
    setState(prev => ({
      ...prev,
      failedActions: new Map()
    }));
  }, []);

  /**
   * Force process all pending batches
   */
  const flushBatches = useCallback(async () => {
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
      batchTimerRef.current = null;
    }

    while (state.batchQueue.length > 0 && !processingBatchRef.current) {
      await processBatchQueue();
    }
  }, [state.batchQueue, processBatchQueue]);

  /**
   * Get current statistics
   */
  const getStats = useCallback((): ResolutionStats => {
    return { ...statsRef.current };
  }, []);

  /**
   * Check if a suggestion is resolved (optimistically or confirmed)
   */
  const isSuggestionResolved = useCallback((suggestionId: string): boolean => {
    return state.resolvedSuggestions.has(suggestionId);
  }, [state.resolvedSuggestions]);

  /**
   * Get available suggestions (not resolved)
   */
  const availableSuggestions = useMemo(() => {
    return suggestions.filter(suggestion => !isSuggestionResolved(suggestion.id));
  }, [suggestions, isSuggestionResolved]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, []);

  return {
    // Core resolution methods
    acceptSuggestion,
    rejectSuggestion,
    batchAcceptSuggestions,
    batchRejectSuggestions,

    // Retry and management
    retryFailedAction,
    clearFailedActions,
    flushBatches,

    // State queries
    isSuggestionResolved,
    availableSuggestions,
    getStats,

    // State information
    pendingActions: Array.from(state.pendingActions.values()),
    failedActions: Array.from(state.failedActions.values()),
    resolvedSuggestions: Array.from(state.resolvedSuggestions.values()),
    batchQueueLength: state.batchQueue.length,
    isProcessing: processingBatchRef.current || state.pendingActions.size > 0,

    // Configuration
    config: finalConfig
  };
}
