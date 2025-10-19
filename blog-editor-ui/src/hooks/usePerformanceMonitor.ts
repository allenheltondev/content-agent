import { useRef, useCallback, useMemo } from 'react';

/**
 * Performance measurement data
 */
export interface PerformanceMeasurement {
  startTime: number;
  endTime?: number;
  duration?: number;
}

/**
 * Performance metrics for a specific operation type
 */
export interface PerformanceMetrics {
  count: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDuration: number;
}

/**
 * Performance thresholds for different operations
 */
export interface PerformanceThresholds {
  navigation?: number;
  resolution?: number;
  rendering?: number;
  [key: string]: number | undefined;
}

/**
 * Configuration for performance monitoring
 */
export interface PerformanceMonitorConfig {
  /**
   * Whether performance monitoring is enabled
   */
  enabled?: boolean;

  /**
   * Performance thresholds for different operations (in milliseconds)
   */
  thresholds?: PerformanceThresholds;

  /**
   * Maximum number of measurements to keep in memory
   */
  maxMeasurements?: number;

  /**
   * Whether to log performance warnings to console
   */
  logWarnings?: boolean;

  /**
   * Callback when a performance threshold is exceeded
   */
  onThresholdExceeded?: (operation: string, duration: number, threshold: number) => void;
}

/**
 * Default configuration for performance monitoring
 */
const DEFAULT_CONFIG: Required<Omit<PerformanceMonitorConfig, 'onThresholdExceeded'>> = {
  enabled: true,
  thresholds: {
    navigation: 100,
    resolution: 200,
    rendering: 50
  },
  maxMeasurements: 100,
  logWarnings: true
};

/**
 * Hook for monitoring performance of suggestion system operations
 */
export function usePerformanceMonitor(config: PerformanceMonitorConfig = {}) {
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config,
    thresholds: {
      ...DEFAULT_CONFIG.thresholds,
      ...config.thresholds
    }
  }), [config]);

  // Store active measurements
  const activeMeasurementsRef = useRef<Map<string, PerformanceMeasurement>>(new Map());

  // Store completed measurements for each operation type
  const measurementsRef = useRef<Map<string, number[]>>(new Map());

  /**
   * Start measuring performance for an operation
   */
  const startMeasurement = useCallback((operation: string, id?: string) => {
    if (!finalConfig.enabled) return;

    const measurementId = id || `${operation}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const startTime = performance.now();

    activeMeasurementsRef.current.set(measurementId, {
      startTime
    });

    return measurementId;
  }, [finalConfig.enabled]);

  /**
   * End measuring performance for an operation
   */
  const endMeasurement = useCallback((operationOrId: string, operation?: string) => {
    if (!finalConfig.enabled) return;

    const endTime = performance.now();
    let measurementId: string;
    let operationType: string;

    // Handle both operation name and measurement ID
    if (operation) {
      measurementId = operationOrId;
      operationType = operation;
    } else {
      // Find measurement by operation type (for simple usage)
      operationType = operationOrId;
      measurementId = Array.from(activeMeasurementsRef.current.keys())
        .find(id => id.startsWith(operationType)) || operationOrId;
    }

    const measurement = activeMeasurementsRef.current.get(measurementId);
    if (!measurement) {
      console.warn(`No active measurement found for: ${measurementId}`);
      return;
    }

    const duration = endTime - measurement.startTime;

    // Update measurement
    measurement.endTime = endTime;
    measurement.duration = duration;

    // Store completed measurement
    if (!measurementsRef.current.has(operationType)) {
      measurementsRef.current.set(operationType, []);
    }

    const measurements = measurementsRef.current.get(operationType)!;
    measurements.push(duration);

    // Keep only the most recent measurements
    if (measurements.length > finalConfig.maxMeasurements) {
      measurements.shift();
    }

    // Remove from active measurements
    activeMeasurementsRef.current.delete(measurementId);

    // Check threshold
    const threshold = finalConfig.thresholds[operationType];
    if (threshold && duration > threshold) {
      if (finalConfig.logWarnings) {
        console.warn(
          `Performance threshold exceeded for ${operationType}: ${duration.toFixed(2)}ms > ${threshold}ms`
        );
      }

      finalConfig.onThresholdExceeded?.(operationType, duration, threshold);
    }

    return duration;
  }, [finalConfig]);

  /**
   * Get performance metrics for a specific operation type
   */
  const getOperationMetrics = useCallback((operation: string): PerformanceMetrics => {
    const measurements = measurementsRef.current.get(operation) || [];

    if (measurements.length === 0) {
      return {
        count: 0,
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        lastDuration: 0
      };
    }

    const totalDuration = measurements.reduce((sum, duration) => sum + duration, 0);
    const averageDuration = totalDuration / measurements.length;
    const minDuration = Math.min(...measurements);
    const maxDuration = Math.max(...measurements);
    const lastDuration = measurements[measurements.length - 1];

    return {
      count: measurements.length,
      totalDuration,
      averageDuration,
      minDuration,
      maxDuration,
      lastDuration
    };
  }, []);

  /**
   * Get performance metrics for all operations
   */
  const getMetrics = useCallback((): Record<string, PerformanceMetrics> => {
    const metrics: Record<string, PerformanceMetrics> = {};

    for (const operation of measurementsRef.current.keys()) {
      metrics[operation] = getOperationMetrics(operation);
    }

    return metrics;
  }, [getOperationMetrics]);

  /**
   * Clear all performance measurements
   */
  const clearMetrics = useCallback(() => {
    measurementsRef.current.clear();
    activeMeasurementsRef.current.clear();
  }, []);

  /**
   * Get a summary of performance issues
   */
  const getPerformanceSummary = useCallback(() => {
    const metrics = getMetrics();
    const issues: Array<{
      operation: string;
      issue: string;
      value: number;
      threshold?: number;
    }> = [];

    for (const [operation, operationMetrics] of Object.entries(metrics)) {
      const threshold = finalConfig.thresholds[operation];

      if (threshold) {
        // Check if average duration exceeds threshold
        if (operationMetrics.averageDuration > threshold) {
          issues.push({
            operation,
            issue: 'Average duration exceeds threshold',
            value: operationMetrics.averageDuration,
            threshold
          });
        }

        // Check if max duration is significantly higher than threshold
        if (operationMetrics.maxDuration > threshold * 2) {
          issues.push({
            operation,
            issue: 'Maximum duration significantly exceeds threshold',
            value: operationMetrics.maxDuration,
            threshold: threshold * 2
          });
        }
      }

      // Check for high variance (inconsistent performance)
      if (operationMetrics.count > 5) {
        const variance = operationMetrics.maxDuration - operationMetrics.minDuration;
        if (variance > operationMetrics.averageDuration) {
          issues.push({
            operation,
            issue: 'High performance variance detected',
            value: variance
          });
        }
      }
    }

    return {
      metrics,
      issues,
      hasIssues: issues.length > 0
    };
  }, [getMetrics, finalConfig.thresholds]);

  /**
   * Measure the performance of a function execution
   */
  const measureFunction = useCallback(<T>(
    operation: string,
    fn: () => T
  ): T => {
    if (!finalConfig.enabled) {
      return fn();
    }

    const measurementId = startMeasurement(operation);
    try {
      const result = fn();
      endMeasurement(measurementId!, operation);
      return result;
    } catch (error) {
      // End measurement even if function throws
      endMeasurement(measurementId!, operation);
      throw error;
    }
  }, [finalConfig.enabled, startMeasurement, endMeasurement]);

  /**
   * Measure the performance of an async function execution
   */
  const measureAsyncFunction = useCallback(async <T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> => {
    if (!finalConfig.enabled) {
      return fn();
    }

    const measurementId = startMeasurement(operation);
    try {
      const result = await fn();
      endMeasurement(measurementId!, operation);
      return result;
    } catch (error) {
      // End measurement even if function throws
      endMeasurement(measurementId!, operation);
      throw error;
    }
  }, [finalConfig.enabled, startMeasurement, endMeasurement]);

  return {
    // Core measurement functions
    startMeasurement,
    endMeasurement,
    measureFunction,
    measureAsyncFunction,

    // Metrics functions
    getOperationMetrics,
    getMetrics,
    getPerformanceSummary,
    clearMetrics,

    // Configuration
    config: finalConfig,
    isEnabled: finalConfig.enabled
  };
}

/**
 * Hook specifically for monitoring suggestion system performance
 */
export function useSuggestionPerformanceMonitor(config: PerformanceMonitorConfig = {}) {
  const suggestionConfig: PerformanceMonitorConfig = {
    enabled: true,
    thresholds: {
      navigation: 100,      // Navigation between suggestions
      resolution: 200,      // Accepting/rejecting suggestions
      highlighting: 50,     // Updating highlights
      scrolling: 100,       // Scroll-to-active functionality
      stateUpdate: 30,      // State management updates
      ...config.thresholds
    },
    maxMeasurements: 50,
    logWarnings: process.env.NODE_ENV === 'development',
    ...config
  };

  return usePerformanceMonitor(suggestionConfig);
}
