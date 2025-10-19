/**
 * Utilities for preventing render loops and stabilizing content rendering
 */

/**
 * Debounce function to prevent excessive re-renders
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function to limit the frequency of function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Create a stable reference that only changes when the value actually changes
 */
export function createStableRef<T>(value: T, _compareFn?: (a: T, b: T) => boolean): T {
  // This would typically be used with useRef in a hook
  // For now, just return the value as this is a utility function
  return value;
}

/**
 * Check if two objects are shallowly equal
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (obj1 == null || obj2 == null) {
    return false;
  }

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
    return obj1 === obj2;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (let key of keys1) {
    if (obj1[key] !== obj2[key]) {
      return false;
    }
  }

  return true;
}

/**
 * Create a memoized version of a function that only re-executes when dependencies change
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getDependencies: (...args: Parameters<T>) => any[]
): T {
  let lastDeps: any[] | undefined;
  let lastResult: ReturnType<T>;

  return ((...args: Parameters<T>) => {
    const currentDeps = getDependencies(...args);

    if (!lastDeps || !shallowEqual(lastDeps, currentDeps)) {
      lastDeps = currentDeps;
      lastResult = fn(...args);
    }

    return lastResult;
  }) as T;
}

/**
 * Batch multiple state updates to prevent multiple re-renders
 */
export function batchUpdates(callback: () => void): void {
  // In React 18+, updates are automatically batched
  // This is a placeholder for potential future batching logic
  callback();
}

/**
 * Check if content has meaningfully changed (ignoring whitespace-only changes)
 */
export function hasContentChanged(oldContent: string, newContent: string): boolean {
  // Normalize whitespace for comparison
  const normalize = (str: string) => str.trim().replace(/\s+/g, ' ');
  return normalize(oldContent) !== normalize(newContent);
}

/**
 * Prevent rapid successive calls that could cause flickering
 */
export class FlickerPrevention {
  private lastCallTime = 0;
  private minInterval: number;

  constructor(minIntervalMs: number = 100) {
    this.minInterval = minIntervalMs;
  }

  shouldAllow(): boolean {
    const now = Date.now();
    if (now - this.lastCallTime >= this.minInterval) {
      this.lastCallTime = now;
      return true;
    }
    return false;
  }

  reset(): void {
    this.lastCallTime = 0;
  }
}

/**
 * Render stability metrics for debugging
 */
export interface RenderStabilityMetrics {
  renderCount: number;
  averageRenderInterval: number;
  isStable: boolean;
  lastRenderTime: number;
}

/**
 * Track render stability metrics
 */
export class RenderStabilityTracker {
  private renderTimes: number[] = [];
  private maxSamples: number;

  constructor(maxSamples: number = 10) {
    this.maxSamples = maxSamples;
  }

  recordRender(): void {
    const now = Date.now();
    this.renderTimes.push(now);

    if (this.renderTimes.length > this.maxSamples) {
      this.renderTimes = this.renderTimes.slice(-this.maxSamples);
    }
  }

  getMetrics(): RenderStabilityMetrics {
    if (this.renderTimes.length < 2) {
      return {
        renderCount: this.renderTimes.length,
        averageRenderInterval: 0,
        isStable: true,
        lastRenderTime: this.renderTimes[0] || 0
      };
    }

    const intervals = [];
    for (let i = 1; i < this.renderTimes.length; i++) {
      intervals.push(this.renderTimes[i] - this.renderTimes[i - 1]);
    }

    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const isStable = averageInterval > 100; // Consider stable if renders are more than 100ms apart

    return {
      renderCount: this.renderTimes.length,
      averageRenderInterval: averageInterval,
      isStable,
      lastRenderTime: this.renderTimes[this.renderTimes.length - 1]
    };
  }

  reset(): void {
    this.renderTimes = [];
  }
}
