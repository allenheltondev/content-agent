import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useActiveSuggestionManager, type ActiveSuggestionManagerConfig } from './useActiveSuggestionManager';
import { useSuggestionCache } from './useSuggestionCache';


/**
 * Configuration for optimized active suggestion manager
 */
export interface OptimizedActiveSuggestionManagerConfig extends ActiveSuggestionManagerConfig {
  /**
   * Whether to enable performance optimizations
   */
  enableOptimizations?: boolean;

  /**
   * Whether to enable caching for suggestion operations
   */
  enableCaching?: boolean;

  /**
   * Whether to enable batched state updates
   */
  enableBatchedUpdates?: boolean;

  /**
   * Batch update delay (ms)
   */
  batchUpdateDelay?: number;

  /**
   * Whether to enable lazy loading for large suggestion sets
   */
  enableLazyLoading?: boolean;

  /**
   * Threshold for enabling lazy loading
   */
  lazyLoadingThreshold?: number;

  /**
   * Whether to enable memory optimization
   */
  enableMemoryOptimization?: boolean;

  /**
   * Memory optimization interval (ms)
   */
  memoryOptimizationInterval?: number;
}

/**
 * Performance metrics for the optimized manager
 */
export interface OptimizedManagerMetrics {
  navigationPerformance: {
    averageTime: number;
    maxTime: number;
    totalNavigations: number;
  };
  resolutionPerformance: {
    averageTime: number;
    maxTime: number;
    totalResolutions: number;
  };
  cachePerformance: {
    hitRate: number;
    totalRequests: number;
    memoryUsage: number;
  };
  memoryUsage: {
    estimatedSize: number;
    lastOptimization: number;
  };
}

/**
 * Batched state update
 */
interface BatchedUpdate {
  type: 'navigation' | 'resolution' | 'state';
  payload: any;
  timestamp: number;
}

/**
 * Default configuration for optimized manager
 */
const DEFAULT_OPTIMIZED_CONFIG: Required<Omit<OptimizedActiveSuggestionManagerConfig, keyof ActiveSuggestionManagerConfig>> = {
  enableOptimizations: true,
  enableCaching: true,
  enableBatchedUpdates: true,
  batchUpdateDelay: 16, // ~60fps
  enableLazyLoading: true,
  lazyLoadingThreshold: 100,
  enableMemoryOptimization: true,
  memoryOptimizationInterval: 30000 // 30 seconds
};

/**
 * Hook for optimized active suggestion management with performance enhancements
 */
export function useOptimizedActiveSuggestionManager(config: OptimizedActiveSuggestionManagerConfig) {
  const finalConfig = useMemo(() => ({
    ...DEFAULT_OPTIMIZED_CONFIG,
    ...config
  }), [config]);

  // Performance monitoring removed

  // Caching for expensive operations
  const {
    cacheSuggestionData: _cacheSuggestionData,
    getOrCompute: _getOrCompute,
    getStats: getCacheStats,
    optimize: optimizeCache
  } = useSuggestionCache({
    maxEntries: 50,
    ttl: 5 * 60 * 1000,
    enableLRU: true,
    enableMonitoring: finalConfig.enableOptimizations
  });

  // Batched updates state
  const batchedUpdatesRef = useRef<BatchedUpdate[]>([]);
  const batchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoryOptimizationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Performance metrics
  const metricsRef = useRef<OptimizedManagerMetrics>({
    navigationPerformance: {
      averageTime: 0,
      maxTime: 0,
      totalNavigations: 0
    },
    resolutionPerformance: {
      averageTime: 0,
      maxTime: 0,
      totalResolutions: 0
    },
    cachePerformance: {
      hitRate: 0,
      totalRequests: 0,
      memoryUsage: 0
    },
    memoryUsage: {
      estimatedSize: 0,
      lastOptimization: Date.now()
    }
  });

  // Lazy loading state
  const [loadedSuggestionCount, setLoadedSuggestionCount] = useState(
    finalConfig.enableLazyLoading ? Math.min(finalConfig.lazyLoadingThreshold, config.suggestions?.length || 0) : config.suggestions?.length || 0
  );

  // Process suggestions with lazy loading and caching
  const processedSuggestions = useMemo(() => {
    if (!finalConfig.enableOptimizations) {
      return config.suggestions || [];
    }

    const suggestions = config.suggestions || [];
    if (finalConfig.enableLazyLoading && suggestions.length > finalConfig.lazyLoadingThreshold) {
      return suggestions.slice(0, loadedSuggestionCount);
    }
    return suggestions;
  }, [config.suggestions, finalConfig, loadedSuggestionCount]);

  // Initialize the base active suggestion manager with processed suggestions
  const baseManager = useActiveSuggestionManager({
    ...config,
    suggestions: processedSuggestions
  });

  // Optimized navigation with performance measurement and caching
  const optimizedNavigateNext = useCallback(() => {
    if (!finalConfig.enableOptimizations) {
      return baseManager.navigateNext();
    }
    // Direct call without performance measurement
    return baseManager.navigateNext();
  }, [finalConfig.enableOptimizations, baseManager.navigateNext]);

  const optimizedNavigatePrevious = useCallback(() => {
    if (!finalConfig.enableOptimizations) {
      return baseManager.navigatePrevious();
    }
    // Direct call without performance measurement
    return baseManager.navigatePrevious();
  }, [finalConfig.enableOptimizations, baseManager.navigatePrevious]);

  // Optimized suggestion resolution with batching
  const optimizedResolveSuggestion = useCallback(async (suggestionId: string, autoAdvance?: boolean) => {
    if (!finalConfig.enableOptimizations) {
      return baseManager.resolveSuggestion(suggestionId, autoAdvance);
    }
    // Direct processing without performance measurement
    if (finalConfig.enableBatchedUpdates) {
        // Add to batch
        batchedUpdatesRef.current.push({
          type: 'resolution',
          payload: { suggestionId, autoAdvance },
          timestamp: Date.now()
        });

        // Process batch if timeout not set
        if (!batchTimeoutRef.current) {
          batchTimeoutRef.current = setTimeout(() => {
            processBatchedUpdates();
          }, finalConfig.batchUpdateDelay);
        }
    } else {
        baseManager.resolveSuggestion(suggestionId, autoAdvance);
    }
  }, [finalConfig, baseManager.resolveSuggestion]);

  // Process batched updates
  const processBatchedUpdates = useCallback(() => {
    if (batchedUpdatesRef.current.length === 0) return;

    const updates = [...batchedUpdatesRef.current];
    batchedUpdatesRef.current = [];
    batchTimeoutRef.current = null;

    // Group updates by type and process
    const resolutionUpdates = updates.filter(u => u.type === 'resolution');

    // Process resolution updates
    for (const update of resolutionUpdates) {
      baseManager.resolveSuggestion(update.payload.suggestionId, update.payload.autoAdvance);
    }
  }, [baseManager.resolveSuggestion]);

  // Load more suggestions for lazy loading
  const loadMoreSuggestions = useCallback(() => {
    if (!finalConfig.enableLazyLoading) return;

    const totalSuggestions = config.suggestions?.length || 0;
    const nextBatchSize = Math.min(finalConfig.lazyLoadingThreshold, totalSuggestions - loadedSuggestionCount);

    if (nextBatchSize > 0) {
      setLoadedSuggestionCount(prev => prev + nextBatchSize);
    }
  }, [finalConfig.enableLazyLoading, finalConfig.lazyLoadingThreshold, config.suggestions?.length, loadedSuggestionCount]);

  // Memory optimization
  const optimizeMemory = useCallback(() => {
    if (!finalConfig.enableMemoryOptimization) return;

    // Optimize cache
    optimizeCache();

    // Clear old batched updates
    const now = Date.now();
    batchedUpdatesRef.current = batchedUpdatesRef.current.filter(
      update => now - update.timestamp < 5000 // Keep only recent updates
    );

    // Update memory metrics
    const cacheStats = getCacheStats();
    metricsRef.current.cachePerformance = {
      hitRate: cacheStats.hitRate,
      totalRequests: cacheStats.hitCount + cacheStats.missCount,
      memoryUsage: cacheStats.memoryUsage
    };

    metricsRef.current.memoryUsage = {
      estimatedSize: cacheStats.memoryUsage + (batchedUpdatesRef.current.length * 100), // Rough estimate
      lastOptimization: now
    };
  }, [finalConfig.enableMemoryOptimization, optimizeCache, getCacheStats]);

  // Setup memory optimization interval
  useEffect(() => {
    if (!finalConfig.enableMemoryOptimization) return;

    memoryOptimizationTimeoutRef.current = setInterval(
      optimizeMemory,
      finalConfig.memoryOptimizationInterval
    );

    return () => {
      if (memoryOptimizationTimeoutRef.current) {
        clearInterval(memoryOptimizationTimeoutRef.current);
      }
    };
  }, [finalConfig.enableMemoryOptimization, finalConfig.memoryOptimizationInterval, optimizeMemory]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      if (memoryOptimizationTimeoutRef.current) {
        clearInterval(memoryOptimizationTimeoutRef.current);
      }
    };
  }, []);

  // Get performance metrics
  const getPerformanceMetrics = useCallback((): OptimizedManagerMetrics => {
    return { ...metricsRef.current };
  }, []);

  // Check if more suggestions can be loaded
  const canLoadMore = useMemo(() => {
    if (!finalConfig.enableLazyLoading) return false;
    const totalSuggestions = config.suggestions?.length || 0;
    return loadedSuggestionCount < totalSuggestions;
  }, [finalConfig.enableLazyLoading, config.suggestions?.length, loadedSuggestionCount]);

  return {
    // All base manager functionality
    ...baseManager,

    // Optimized methods (override base methods)
    navigateNext: optimizedNavigateNext,
    navigatePrevious: optimizedNavigatePrevious,
    resolveSuggestion: optimizedResolveSuggestion,

    // Additional optimized functionality
    loadMoreSuggestions,
    optimizeMemory,
    getPerformanceMetrics,

    // Optimization status
    isOptimized: finalConfig.enableOptimizations,
    canLoadMore,
    loadedSuggestionCount,
    totalSuggestionCount: config.suggestions?.length || 0,

    // Configuration
    config: finalConfig
  };
}

/**
 * Hook for creating an optimized active suggestion manager with default performance settings
 */
export function useHighPerformanceActiveSuggestionManager(config: ActiveSuggestionManagerConfig) {
  const optimizedConfig: OptimizedActiveSuggestionManagerConfig = {
    ...config,
    enableOptimizations: true,
    enableCaching: true,
    enableBatchedUpdates: true,
    batchUpdateDelay: 16,
    enableLazyLoading: config.suggestions.length > 50,
    lazyLoadingThreshold: 50,
    enableMemoryOptimization: true,
    memoryOptimizationInterval: 30000
  };

  return useOptimizedActiveSuggestionManager(optimizedConfig);
}
