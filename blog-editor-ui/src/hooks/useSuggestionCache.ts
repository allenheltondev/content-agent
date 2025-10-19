import { useRef, useCallback, useMemo } from 'react';
import type { Suggestion } from '../types';

/**
 * Cache entry for suggestion-related data
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Configuration for suggestion caching
 */
export interface SuggestionCacheConfig {
  /**
   * Maximum number of entries to keep in cache
   */
  maxEntries?: number;

  /**
   * Time-to-live for cache entries (in milliseconds)
   */
  ttl?: number;

  /**
   * Whether to enable LRU (Least Recently Used) eviction
   */
  enableLRU?: boolean;

  /**
   * Whether to enable performance monitoring for cache operations
   */
  enableMonitoring?: boolean;
}

/**
 * Cached suggestion data
 */
export interface CachedSuggestionData {
  suggestions: Suggestion[];
  availableSuggestions: Suggestion[];
  suggestionsByType: Record<string, Suggestion[]>;
  suggestionPositions: Map<string, { startOffset: number; endOffset: number }>;
  overlappingSuggestions: Map<string, string[]>;
  contentHash: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  memoryUsage: number; // Estimated in bytes
}

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: Required<SuggestionCacheConfig> = {
  maxEntries: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
  enableLRU: true,
  enableMonitoring: true
};

/**
 * Hook for caching suggestion-related computations and data
 */
export function useSuggestionCache(config: SuggestionCacheConfig = {}) {
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config]);

  // Cache storage
  const cacheRef = useRef<Map<string, CacheEntry<any>>>(new Map());

  // Cache statistics
  const statsRef = useRef<CacheStats>({
    totalEntries: 0,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    evictionCount: 0,
    memoryUsage: 0
  });

  /**
   * Generate a cache key fultiple parameters
   */
  const generateCacheKey = useCallback((...params: any[]): string => {
    return params.map(param => {
      if (typeof param === 'object' && param !== null) {
        return JSON.stringify(param);
      }
      return String(param);
    }).join('|');
  }, []);

  /**
   * Calculate estimated memory usage of a value
   */
  const estimateMemoryUsage = useCallback((value: any): number => {
    const jsonString = JSON.stringify(value);
    return jsonString.length * 2; // Rough estimate: 2 bytes per character
  }, []);

  /**
   * Check if a cache entry is expired
   */
  const isExpired = useCallback((entry: CacheEntry<any>): boolean => {
    return Date.now() - entry.timestamp > finalConfig.ttl;
  }, [finalConfig.ttl]);

  /**
   * Evict expired entries
   */
  const evictExpired = useCallback(() => {
    let evictedCount = 0;

    for (const [key, entry] of cacheRef.current.entries()) {
      if (isExpired(entry)) {
        cacheRef.current.delete(key);
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      statsRef.current.evictionCount += evictedCount;
      statsRef.current.totalEntries = cacheRef.current.size;
    }
  }, [isExpired]);

  /**
   * Evict least recently used entries
   */
  const evictLRU = useCallback((targetSize: number) => {
    if (!finalConfig.enableLRU || cacheRef.current.size <= targetSize) {
      return;
    }

    // Sort entries by last accessed time (ascending)
    const entries = Array.from(cacheRef.current.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    const toEvict = entries.slice(0, cacheRef.current.size - targetSize);

    for (const [key] of toEvict) {
      cacheRef.current.delete(key);
      statsRef.current.evictionCount++;
    }

    statsRef.current.totalEntries = cacheRef.current.size;
  }, [finalConfig.enableLRU]);

  /**
   * Set a value in the cache
   */
  const set = useCallback(<T>(key: string, value: T): void => {
    // Evict expired entries first
    evictExpired();

    // Evict LRU entries if we're at capacity
    if (cacheRef.current.size >= finalConfig.maxEntries) {
      evictLRU(finalConfig.maxEntries - 1);
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: now,
      accessCount: 0,
      lastAccessed: now
    };

    cacheRef.current.set(key, entry);
    statsRef.current.totalEntries = cacheRef.current.size;

    // Update memory usage estimate
    if (finalConfig.enableMonitoring) {
      statsRef.current.memoryUsage += estimateMemoryUsage(value);
    }
  }, [finalConfig.maxEntries, evictExpired, evictLRU, finalConfig.enableMonitoring, estimateMemoryUsage]);

  /**
   * Get a value from the cache
   */
  const get = useCallback(<T>(key: string): T | undefined => {
    const entry = cacheRef.current.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      statsRef.current.missCount++;
      return undefined;
    }

    if (isExpired(entry)) {
      cacheRef.current.delete(key);
      statsRef.current.missCount++;
      statsRef.current.evictionCount++;
      statsRef.current.totalEntries = cacheRef.current.size;
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    statsRef.current.hitCount++;

    // Update hit rate
    const totalRequests = statsRef.current.hitCount + statsRef.current.missCount;
    statsRef.current.hitRate = statsRef.current.hitCount / totalRequests;

    return entry.data;
  }, [isExpired]);

  /**
   * Check if a key exists in the cache
   */
  const has = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    return entry !== undefined && !isExpired(entry);
  }, [isExpired]);

  /**
   * Delete a specific key from the cache
   */
  const del = useCallback((key: string): boolean => {
    const deleted = cacheRef.current.delete(key);
    if (deleted) {
      statsRef.current.totalEntries = cacheRef.current.size;
    }
    return deleted;
  }, []);

  /**
   * Clear all cache entries
   */
  const clear = useCallback(() => {
    cacheRef.current.clear();
    statsRef.current = {
      totalEntries: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      evictionCount: 0,
      memoryUsage: 0
    };
  }, []);

  /**
   * Get or compute a value with caching
   */
  const getOrCompute = useCallback(<T>(
    key: string,
    computeFn: () => T
  ): T => {
    const cached = get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const computed = computeFn();
    set(key, computed);
    return computed;
  }, [get, set]);

  /**
   * Cache suggestion processing results
   */
  const cacheSuggestionData = useCallback((
    suggestions: Suggestion[],
    content: string,
    resolvedSuggestions: string[] = []
  ): CachedSuggestionData => {
    const contentHash = btoa(content).substring(0, 16); // Simple content hash
    const cacheKey = generateCacheKey('suggestionData', suggestions.length, contentHash, resolvedSuggestions.length);

    return getOrCompute(cacheKey, () => {
      // Filter available suggestions
      const availableSuggestions = suggestions.filter(
        suggestion => !resolvedSuggestions.includes(suggestion.id)
      );

      // Group suggestions by type
      const suggestionsByType: Record<string, Suggestion[]> = {};
      for (const suggestion of availableSuggestions) {
        if (!suggestionsByType[suggestion.type]) {
          suggestionsByType[suggestion.type] = [];
        }
        suggestionsByType[suggestion.type].push(suggestion);
      }

      // Cache suggestion positions
      const suggestionPositions = new Map<string, { startOffset: number; endOffset: number }>();
      for (const suggestion of availableSuggestions) {
        suggestionPositions.set(suggestion.id, {
          startOffset: suggestion.startOffset,
          endOffset: suggestion.endOffset
        });
      }

      // Calculate overlapping suggestions
      const overlappingSuggestions = new Map<string, string[]>();
      for (const suggestion of availableSuggestions) {
        const overlapping = availableSuggestions.filter(other =>
          other.id !== suggestion.id &&
          !(other.endOffset <= suggestion.startOffset || other.startOffset >= suggestion.endOffset)
        ).map(s => s.id);

        if (overlapping.length > 0) {
          overlappingSuggestions.set(suggestion.id, overlapping);
        }
      }

      return {
        suggestions,
        availableSuggestions,
        suggestionsByType,
        suggestionPositions,
        overlappingSuggestions,
        contentHash
      };
    });
  }, [generateCacheKey, getOrCompute]);

  /**
   * Cache highlight boundary calculations
   */
  const cacheHighlightBoundaries = useCallback((
    suggestionId: string,
    content: string,
    startOffset: number,
    endOffset: number
  ) => {
    const cacheKey = generateCacheKey('boundaries', suggestionId, content.length, startOffset, endOffset);

    return getOrCompute(cacheKey, () => {
      // Calculate text boundaries and positioning
      const beforeText = content.substring(0, startOffset);
      const highlightText = content.substring(startOffset, endOffset);
      const afterText = content.substring(endOffset);

      // Calculate line and column positions
      const beforeLines = beforeText.split('\n');
      const lineNumber = beforeLines.length;
      const columnStart = beforeLines[beforeLines.length - 1].length;

      const highlightLines = highlightText.split('\n');
      const isMultiline = highlightLines.length > 1;
      const columnEnd = isMultiline
        ? highlightLines[highlightLines.length - 1].length
        : columnStart + highlightText.length;

      return {
        beforeText,
        highlightText,
        afterText,
        lineNumber,
        columnStart,
        columnEnd,
        isMultiline,
        textLength: highlightText.length
      };
    });
  }, [generateCacheKey, getOrCompute]);

  /**
   * Get cache statistics
   */
  const getStats = useCallback((): CacheStats => {
    return { ...statsRef.current };
  }, []);

  /**
   * Optimize cache performance by cleaning up expired entries
   */
  const optimize = useCallback(() => {
    evictExpired();

    // If still over capacity, evict LRU entries
    if (cacheRef.current.size > finalConfig.maxEntries * 0.8) {
      evictLRU(Math.floor(finalConfig.maxEntries * 0.7));
    }
  }, [evictExpired, evictLRU, finalConfig.maxEntries]);

  return {
    // Core cache operations
    set,
    get,
    has,
    del,
    clear,
    getOrCompute,

    // Suggestion-specific caching
    cacheSuggestionData,
    cacheHighlightBoundaries,

    // Cache management
    generateCacheKey,
    getStats,
    optimize,

    // Configuration
    config: finalConfig
  };
}

/**
 * Hook specifically for caching active suggestion system data
 */
export function useActiveSuggestionCache(config: SuggestionCacheConfig = {}) {
  const activeSuggestionConfig: SuggestionCacheConfig = {
    maxEntries: 50, // Smaller cache for active suggestion data
    ttl: 2 * 60 * 1000, // 2 minutes (shorter TTL for active data)
    enableLRU: true,
    enableMonitoring: true,
    ...config
  };

  return useSuggestionCache(activeSuggestionConfig);
}
