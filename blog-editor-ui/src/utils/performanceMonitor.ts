/**
 * Performance monitoring utilities for editor mode toggle optimizations
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
on?: number;
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  totalMeasurements: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
}

/**
 * Performance monitor for tracking editor operations
 */
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private activeMetrics: Map<string, PerformanceMetric> = new Map();
  private maxMetricsPerType = 1000; // Limit memory usage

  /**
   * Start measuring a performance metric
   */
  start(name: string, metadata?: Record<string, any>): string {
    const id = `${name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.activeMetrics.set(id, metric);
    return id;
  }

  /**
   * End measuring a performance metric
   */
  end(id: string): number | null {
    const metric = this.activeMetrics.get(id);
    if (!metric) {
      console.warn(`Performance metric with id ${id} not found`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Store the completed metric
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }

    const metricsList = this.metrics.get(metric.name)!;
    metricsList.push(metric);

    // Limit memory usage by keeping only recent metrics
    if (metricsList.length > this.maxMetricsPerType) {
      metricsList.shift(); // Remove oldest metric
    }

    // Clean up active metric
    this.activeMetrics.delete(id);

    return metric.duration;
  }

  /**
   * Measure a synchronous operation
   */
  measure<T>(name: string, operation: () => T, metadata?: Record<string, any>): T {
    const id = this.start(name, metadata);
    try {
      const result = operation();
      this.end(id);
      return result;
    } catch (error) {
      this.end(id);
      throw error;
    }
  }

  /**
   * Measure an asynchronous operation
   */
  async measureAsync<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const id = this.start(name, metadata);
    try {
      const result = await operation();
      this.end(id);
      return result;
    } catch (error) {
      this.end(id);
      throw error;
    }
  }

  /**
   * Get performance statistics for a metric type
   */
  getStats(name: string): PerformanceStats | null {
    const metricsList = this.metrics.get(name);
    if (!metricsList || metricsList.length === 0) {
      return null;
    }

    const durations = metricsList
      .filter(m => m.duration !== undefined)
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    if (durations.length === 0) {
      return null;
    }

    const sum = durations.reduce((acc, duration) => acc + duration, 0);
    const average = sum / durations.length;

    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    return {
      totalMeasurements: durations.length,
      averageDuration: average,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[p95Index] || durations[durations.length - 1],
      p99Duration: durations[p99Index] || durations[durations.length - 1]
    };
  }

  /**
   * Get all available metric names
   */
  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
    this.activeMetrics.clear();
  }

  /**
   * Clear metrics for a specific type
   */
  clearMetric(name: string): void {
    this.metrics.delete(name);

    // Clear any active metrics of this type
    for (const [id, metric] of this.activeMetrics.entries()) {
      if (metric.name === name) {
        this.activeMetrics.delete(id);
      }
    }
  }

  /**
   * Get recent metrics for debugging
   */
  getRecentMetrics(name: string, count: number = 10): PerformanceMetric[] {
    const metricsList = this.metrics.get(name);
    if (!metricsList) {
      return [];
    }

    return metricsList.slice(-count);
  }

  /**
   * Log performance summary to console
   */
  logSummary(): void {
    console.group('Performance Monitor Summary');

    for (const name of this.getMetricNames()) {
      const stats = this.getStats(name);
      if (stats) {
        console.log(`${name}:`, {
          count: stats.totalMeasurements,
          avg: `${stats.averageDuration.toFixed(2)}ms`,
          min: `${stats.minDuration.toFixed(2)}ms`,
          max: `${stats.maxDuration.toFixed(2)}ms`,
          p95: `${stats.p95Duration.toFixed(2)}ms`,
          p99: `${stats.p99Duration.toFixed(2)}ms`
        });
      }
    }

    console.groupEnd();
  }

  /**
   * Export metrics data for analysis
   */
  exportMetrics(): Record<string, PerformanceMetric[]> {
    const exported: Record<string, PerformanceMetric[]> = {};

    for (const [name, metricsList] of this.metrics.entries()) {
      exported[name] = [...metricsList]; // Deep copy
    }

    return exported;
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measure(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Decorator for measuring async method performance
 */
export function measureAsyncPerformance(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const name = metricName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measureAsync(name, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Hook for using performance monitoring in React components
 */
export function usePerformanceMonitor() {
  return {
    start: performanceMonitor.start.bind(performanceMonitor),
    end: performanceMonitor.end.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    measureAsync: performanceMonitor.measureAsync.bind(performanceMonitor),
    getStats: performanceMonitor.getStats.bind(performanceMonitor),
    logSummary: performanceMonitor.logSummary.bind(performanceMonitor)
  };
}
