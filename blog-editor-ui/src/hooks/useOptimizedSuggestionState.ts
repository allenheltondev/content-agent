import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Suggestion } from '../types';

/**
 * Optimized suggestion state that minimizes re-renders
 */
export interface OptimizedSuggestionState {
  suggestions: Suggestion[];
  acceptedIds: Set<string>;
  rejectedIds: Set<string>;
  deletedIds: Set<string>;
  lastUpdated: number;
}

/**
 * State change event for selective subscriptions
 */
export interface StateChangeEvent {
  type: 'suggestions' | 'accepted' | 'rejected' | 'deleted' | 'batch';
  suggestionIds: string[];
  timestamp: number;
}

/**
 * Subscription callback for state changes
 */
export type StateChangeCallback = (event: StateChangeEvent) => void;

/**
 * Memoized computed values to prevent recalculation
 */
interface ComputedValues {
  activeSuggestions: Suggestion[];
  suggestionsByType: Record<string, Suggestion[]>;
  stats: {
    total: number;
    active: number;
    accepted: number;
    rejected: number;
    deleted: number;
    byType: Record<string, number>;
  };
  lastComputed: number;
}

/**
 * Configuration for state optimization
 */
export interface StateOptimizationConfig {
  enableMemoization: boolean;
  memoizationTTL: number; // Time to live for memoized values (ms)
  batchStateUpdates: boolean;
  batchDelay: number; // Delay for batching state updates (ms)
}

/**
 * Default optimization configuration
 */
const DEFAULT_CONFIG: StateOptimizationConfig = {
  enableMemoization: true,
  memoizationTTL: 1000, // 1 second
  batchStateUpdates: true,
  batchDelay: 50 // 50ms batching delay
};

/**
 * Hook for optimized suggestion state management
 */
export function useOptimizedSuggestionState(
  initialSuggestions: Suggestion[] = [],
  config: Partial<StateOptimizationConfig> = {}
) {
  const resolvedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);

  // Core state
  const [state, setState] = useState<OptimizedSuggestionState>(() => ({
    suggestions: initialSuggestions,
    acceptedIds: new Set(),
    rejectedIds: new Set(),
    deletedIds: new Set(),
    lastUpdated: Date.now()
  }));

  // Memoized computed values
  const computedValuesRef = useRef<ComputedValues | null>(null);

  // Subscribers for selective updates
  const subscribersRef = useRef<Map<string, StateChangeCallback>>(new Map());

  // Batching state
  const pendingUpdatesRef = useRef<Array<() => void>>([]);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Subscribe to state changes
   */
  const subscribe = useCallback((id: string, callback: StateChangeCallback) => {
    subscribersRef.current.set(id, callback);

    return () => {
      subscribersRef.current.delete(id);
    };
  }, []);

  /**
   * Notify subscribers of state changes
   */
  const notifySubscribers = useCallback((event: StateChangeEvent) => {
    subscribersRef.current.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in state change subscriber:', error);
      }
    });
  }, []);

  /**
   * Process batched state updates
   */
  const processBatchedUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.length === 0) return;

    const updates = pendingUpdatesRef.current.splice(0);
    const affectedIds = new Set<string>();

    // Apply all updates in a single setState call
    setState(prevState => {
      let newState = prevState;

      updates.forEach(update => {
        update.call(null);
        // This is a simplified approach - in practice, you'd need to track changes
      });

      return {
        ...newState,
        lastUpdated: Date.now()
      };
    });

    // Notify subscribers
    notifySubscribers({
      type: 'batch',
      suggestionIds: Array.from(affectedIds),
      timestamp: Date.now()
    });

    // Clear memoized values
    computedValuesRef.current = null;
  }, [notifySubscribers]);

  /**
   * Schedule a state update (with optional batching)
   */
  const scheduleUpdate = useCallback((updateFn: () => void, suggestionIds: string[], type: StateChangeEvent['type']) => {
    if (resolvedConfig.batchStateUpdates) {
      pendingUpdatesRef.current.push(updateFn);

      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      batchTimeoutRef.current = setTimeout(processBatchedUpdates, resolvedConfig.batchDelay);
    } else {
      // Apply update immediately
      setState(prevState => {
        const newState = { ...prevState };
        updateFn();
        return {
          ...newState,
          lastUpdated: Date.now()
        };
      });

      // Notify subscribers
      notifySubscribers({
        type,
        suggestionIds,
        timestamp: Date.now()
      });

      // Clear memoized values
      computedValuesRef.current = null;
    }
  }, [resolvedConfig.batchStateUpdates, resolvedConfig.batchDelay, processBatchedUpdates, notifySubscribers]);

  /**
   * Update suggestions list
   */
  const updateSuggestions = useCallback((newSuggestions: Suggestion[]) => {
    const suggestionIds = newSuggestions.map(s => s.id);

    scheduleUpdate(() => {
      setState(prev => ({
        ...prev,
        suggestions: newSuggestions
      }));
    }, suggestionIds, 'suggestions');
  }, [scheduleUpdate]);

  /**
   * Mark suggestion as accepted
   */
  const markAccepted = useCallback((suggestionId: string) => {
    scheduleUpdate(() => {
      setState(prev => ({
        ...prev,
        acceptedIds: new Set(prev.acceptedIds).add(suggestionId),
        rejectedIds: new Set([...prev.rejectedIds].filter(id => id !== suggestionId)),
        deletedIds: new Set([...prev.deletedIds].filter(id => id !== suggestionId))
      }));
    }, [suggestionId], 'accepted');
  }, [scheduleUpdate]);

  /**
   * Mark suggestion as rejected
   */
  const markRejected = useCallback((suggestionId: string) => {
    scheduleUpdate(() => {
      setState(prev => ({
        ...prev,
        rejectedIds: new Set(prev.rejectedIds).add(suggestionId),
        acceptedIds: new Set([...prev.acceptedIds].filter(id => id !== suggestionId)),
        deletedIds: new Set([...prev.deletedIds].filter(id => id !== suggestionId))
      }));
    }, [suggestionId], 'rejected');
  }, [scheduleUpdate]);

  /**
   * Mark suggestion as deleted
   */
  const markDeleted = useCallback((suggestionId: string) => {
    scheduleUpdate(() => {
      setState(prev => ({
        ...prev,
        deletedIds: new Set(prev.deletedIds).add(suggestionId),
        acceptedIds: new Set([...prev.acceptedIds].filter(id => id !== suggestionId)),
        rejectedIds: new Set([...prev.rejectedIds].filter(id => id !== suggestionId))
      }));
    }, [suggestionId], 'deleted');
  }, [scheduleUpdate]);

  /**
   * Batch mark multiple suggestions
   */
  const batchMarkSuggestions = useCallback((
    operations: Array<{ suggestionId: string; action: 'accepted' | 'rejected' | 'deleted' }>
  ) => {
    const suggestionIds = operations.map(op => op.suggestionId);

    scheduleUpdate(() => {
      setState(prev => {
        let newAccepted = new Set(prev.acceptedIds);
        let newRejected = new Set(prev.rejectedIds);
        let newDeleted = new Set(prev.deletedIds);

        operations.forEach(({ suggestionId, action }) => {
          // Remove from all sets first
          newAccepted.delete(suggestionId);
          newRejected.delete(suggestionId);
          newDeleted.delete(suggestionId);

          // Add to appropriate set
          switch (action) {
            case 'accepted':
              newAccepted.add(suggestionId);
              break;
            case 'rejected':
              newRejected.add(suggestionId);
              break;
            case 'deleted':
              newDeleted.add(suggestionId);
              break;
          }
        });

        return {
          ...prev,
          acceptedIds: newAccepted,
          rejectedIds: newRejected,
          deletedIds: newDeleted
        };
      });
    }, suggestionIds, 'batch');
  }, [scheduleUpdate]);

  /**
   * Undo suggestion marking
   */
  const undoMarking = useCallback((suggestionId: string) => {
    scheduleUpdate(() => {
      setState(prev => ({
        ...prev,
        acceptedIds: new Set([...prev.acceptedIds].filter(id => id !== suggestionId)),
        rejectedIds: new Set([...prev.rejectedIds].filter(id => id !== suggestionId)),
        deletedIds: new Set([...prev.deletedIds].filter(id => id !== suggestionId))
      }));
    }, [suggestionId], 'batch');
  }, [scheduleUpdate]);

  /**
   * Get or compute memoized values
   */
  const getComputedValues = useCallback((): ComputedValues => {
    const now = Date.now();

    // Return cached values if still valid
    if (resolvedConfig.enableMemoization &&
        computedValuesRef.current &&
        (now - computedValuesRef.current.lastComputed) < resolvedConfig.memoizationTTL) {
      return computedValuesRef.current;
    }

    // Compute fresh values
    const activeSuggestions = state.suggestions.filter(
      s => !state.acceptedIds.has(s.id) &&
           !state.rejectedIds.has(s.id) &&
           !state.deletedIds.has(s.id)
    );

    const suggestionsByType = activeSuggestions.reduce((acc, suggestion) => {
      if (!acc[suggestion.type]) {
        acc[suggestion.type] = [];
      }
      acc[suggestion.type].push(suggestion);
      return acc;
    }, {} as Record<string, Suggestion[]>);

    const byType = Object.keys(suggestionsByType).reduce((acc, type) => {
      acc[type] = suggestionsByType[type].length;
      return acc;
    }, {} as Record<string, number>);

    const computed: ComputedValues = {
      activeSuggestions,
      suggestionsByType,
      stats: {
        total: state.suggestions.length,
        active: activeSuggestions.length,
        accepted: state.acceptedIds.size,
        rejected: state.rejectedIds.size,
        deleted: state.deletedIds.size,
        byType
      },
      lastComputed: now
    };

    // Cache the computed values
    if (resolvedConfig.enableMemoization) {
      computedValuesRef.current = computed;
    }

    return computed;
  }, [state, resolvedConfig.enableMemoization, resolvedConfig.memoizationTTL]);

  // Memoized computed values that only update when state changes
  const computedValues = useMemo(() => getComputedValues(), [state.lastUpdated, getComputedValues]);

  /**
   * Check if suggestion is in a specific state
   */
  const isSuggestionInState = useCallback((
    suggestionId: string,
    stateType: 'accepted' | 'rejected' | 'deleted' | 'active'
  ): boolean => {
    switch (stateType) {
      case 'accepted':
        return state.acceptedIds.has(suggestionId);
      case 'rejected':
        return state.rejectedIds.has(suggestionId);
      case 'deleted':
        return state.deletedIds.has(suggestionId);
      case 'active':
        return !state.acceptedIds.has(suggestionId) &&
               !state.rejectedIds.has(suggestionId) &&
               !state.deletedIds.has(suggestionId);
      default:
        return false;
    }
  }, [state.acceptedIds, state.rejectedIds, state.deletedIds]);

  /**
   * Get suggestions by state
   */
  const getSuggestionsByState = useCallback((
    stateType: 'accepted' | 'rejected' | 'deleted' | 'active'
  ): Suggestion[] => {
    switch (stateType) {
      case 'accepted':
        return state.suggestions.filter(s => state.acceptedIds.has(s.id));
      case 'rejected':
        return state.suggestions.filter(s => state.rejectedIds.has(s.id));
      case 'deleted':
        return state.suggestions.filter(s => state.deletedIds.has(s.id));
      case 'active':
        return computedValues.activeSuggestions;
      default:
        return [];
    }
  }, [state.suggestions, state.acceptedIds, state.rejectedIds, state.deletedIds, computedValues.activeSuggestions]);

  /**
   * Clear all state
   */
  const clearState = useCallback(() => {
    setState({
      suggestions: [],
      acceptedIds: new Set(),
      rejectedIds: new Set(),
      deletedIds: new Set(),
      lastUpdated: Date.now()
    });

    computedValuesRef.current = null;
    pendingUpdatesRef.current = [];

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      subscribersRef.current.clear();
    };
  }, []);

  return {
    // State access
    suggestions: state.suggestions,
    activeSuggestions: computedValues.activeSuggestions,
    suggestionsByType: computedValues.suggestionsByType,
    stats: computedValues.stats,

    // State mutations
    updateSuggestions,
    markAccepted,
    markRejected,
    markDeleted,
    batchMarkSuggestions,
    undoMarking,
    clearState,

    // State queries
    isSuggestionInState,
    getSuggestionsByState,

    // Subscription system
    subscribe,

    // Raw state access (for advanced use cases)
    rawState: state
  };
}
