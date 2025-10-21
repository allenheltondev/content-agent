import { useCallback, useEffect } from 'react';
import type { Suggestion, ContentDiff } from '../types';
import type { SuggestionDelta } from '../services/SuggestionRecalculationService';

/**
 * Cache key for suggestion position calculations
 */
interface CacheKey {
  contentHash: string;
  suggestionIds: string;
  diffsHash: string;
}

/**
 * Cached calculation result
 */
interface CachedResult {
  deltas: SuggestionDelta[];
  timestamp: number;
  hitCount: number;
}

/**
 * Configuration for the suggestion cache
 */
interface CacheConfig {
  maxSize: number;
  maxAge: number; // milliseconds
  enableMetrics: boolean;
}

/**
 * Cache metrics for performance monitoring
 */
interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
  averageHitTime: number;
  averageMissTime: number;
}

/**
 * LRU Cache for suggestion position calculations
 * Optimizes performance by caching expensive diff calculations
 */
export class SuggestionPositionCache {
  private cache = new Map<string, CachedResult>();
  private accessOrder: string[] = [];
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalRequests: 0,
    averageHitTime: 0,
    averageMissTime: 0
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      maxAge: 5 * 60 * 1000, // 5 minutes
      enableMetrics: true,
      ...config
    };
  }

  /**
   * Generate a cache key from content and suggestions
   */
  private generateCacheKey(
    content: string,
    suggestions: Suggestion[],
    diffs: ContentDiff[]
  ): string {
    const contentHash = this.hashString(content);
    const suggestionIds = suggestions.map(s => s.id).sort().join(',');
    const diffsHash = this.hashString(JSON.stringify(diffs));

    return `${contentHash}:${this.hashString(suggestionIds)}:${diffsHash}`;
  }

  /**
   * Simple string hashing function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached suggestion deltas if available
   */
  get(
    content: string,
    suggestions: Suggestion[],
    diffs: ContentDiff[]
  ): SuggestionDelta[] | null {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    const key = this.generateCacheKey(content, suggestions, diffs);
    const cached = this.cache.get(key);

    if (!cached) {
      this.metrics.misses++;
      if (this.config.enableMetrics) {
        const missTime = performance.now() - startTime;
        this.metrics.averageMissTime =
          (this.metrics.averageMissTime * (this.metrics.misses - 1) + missTime) / this.metrics.misses;
      }
      return null;
    }

    // Check if cache entry has expired
    const now = Date.now();
    if (now - cached.timestamp > this.config.maxAge) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.metrics.misses++;
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    cached.hitCount++;
    this.metrics.hits++;

    if (this.config.enableMetrics) {
      const hitTime = performance.now() - startTime;
      this.metrics.averageHitTime =
        (this.metrics.averageHitTime * (this.metrics.hits - 1) + hitTime) / this.metrics.hits;
    }

    return cached.deltas;
  }

  /**
   * Store suggestion deltas in cache
   */
  set(
    content: string,
    suggestions: Suggestion[],
    diffs: ContentDiff[],
    deltas: SuggestionDelta[]
  ): void {
    const key = this.generateCacheKey(content, suggestions, diffs);

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    // Evict oldest entries if cache is full
    while (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    // Add new entry
    this.cache.set(key, {
      deltas: [...deltas], // Deep copy to prevent mutations
      timestamp: Date.now(),
      hitCount: 0
    });

    this.accessOrder.push(key);
  }

  /**
   * Update access order for LRU eviction
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  /**
   * Remove key from access order array
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Evict the oldest (least recently used) entry
   */
  private evictOldest(): void {
    if (this.accessOrder.length === 0) return;

    const oldestKey = this.accessOrder.shift()!;
    this.cache.delete(oldestKey);
    this.metrics.evictions++;
  }

  /**
   * Clear all cached entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
    this.resetMetrics();
  }

  /**
   * Remove expired entries from cache
   */
  cleanup(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.config.maxAge) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
    }
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics & { size: number; hitRate: number } {
    const hitRate = this.metrics.totalRequests > 0
      ? this.metrics.hits / this.metrics.totalRequests
      : 0;

    return {
      ...this.metrics,
      size: this.cache.size,
      hitRate
    };
  }

  /**
   * Reset cache metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      averageHitTime: 0,
      averageMissTime: 0
    };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Enforce new size limit if it's smaller
    while (this.cache.size > this.config.maxSize) {
      this.evictOldest();
    }
  }

  /**
   * Get current cache configuration
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }
}

/**
 * Global suggestion position cache instance
 */
export const suggestionPositionCache = new SuggestionPositionCache({
  maxSize: 50, // Reasonable size for editor usage
  maxAge: 3 * 60 * 1000, // 3 minutes
  enableMetrics: true
});

/**
 * Hook for using the suggestion position cache with automatic cleanup
 */
export function useSuggestionPositionCache() {
  // Cleanup expired entries periodically
  const cleanup = useCallback(() => {
    suggestionPositionCache.cleanup();
  }, []);

  // Set up periodic cleanup
  useEffect(() => {
    const interval = setInterval(cleanup, 60 * 1000); // Cleanup every minute
    return () => clearInterval(interval);
  }, [cleanup]);

  return suggestionPositionCache;
}
