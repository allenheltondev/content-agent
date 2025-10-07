import { useRef, useEffect } from 'react';

interface RenderMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderInterval: number;
  isFlickering: boolean;
  componentName: string;
}

interface UseRenderPerformanceMonitorOptions {
  componentName: string;
  flickerThreshold?: number; // renders per second that indicate flickering
  enabled?: boolean;
  onFlickerDetected?: (metrics: RenderMetrics) => void;
}

/**
 * Hook to monitor render performance and detect content flickering
 */
export function useRenderPerformanceMonitor({
  componentName,
  flickerThreshold = 10, // 10 renders per second indicates flickering
  enabled = true,
  onFlickerDetected
}: UseRenderPerformanceMonitorOptions) {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const lastFlickerReportRef = useRef(0);
  const flickerReportCooldownMs = 5000; // Report flickering at most once every 5 seconds

  useEffect(() => {
    if (!enabled) return;

    const now = Date.now();
    renderCountRef.current += 1;
    renderTimesRef.current.push(now);

    // Keep only the last 20 render times for analysis
    if (renderTimesRef.current.length > 20) {
      renderTimesRef.current = renderTimesRef.current.slice(-20);
    }

    // Calculate metrics if we have enough data
    if (renderTimesRef.current.length >= 5) {
      const times = renderTimesRef.current;
      const timeSpan = times[times.length - 1] - times[0];
      const renderRate = (times.length - 1) / (timeSpan / 1000); // renders per second
      const averageInterval = timeSpan / (times.length - 1);

      const isFlickering = renderRate > flickerThreshold;

      const metrics: RenderMetrics = {
        renderCount: renderCountRef.current,
        lastRenderTime: now,
        averageRenderInterval: averageInterval,
        isFlickering,
        componentName
      };

      // Report flickering if detected and cooldown has passed
      if (isFlickering && now - lastFlickerReportRef.current > flickerReportCooldownMs) {
        lastFlickerReportRef.current = now;
        console.warn(`🔄 Render flickering detected in ${componentName}:`, {
          renderRate: renderRate.toFixed(2) + ' renders/sec',
          averageInterval: averageInterval.toFixed(2) + 'ms',
          totalRenders: renderCountRef.current,
          threshold: flickerThreshold + ' renders/sec'
        });
        onFlickerDetected?.(metrics);
      }
    }
  });

  // Return current metrics
  const getCurrentMetrics = (): RenderMetrics => {
    const times = renderTimesRef.current;
    const now = Date.now();

    let averageInterval = 0;
    let isFlickering = false;

    if (times.length >= 2) {
      const timeSpan = times[times.length - 1] - times[0];
      const renderRate = (times.length - 1) / (timeSpan / 1000);
      averageInterval = timeSpan / (times.length - 1);
      isFlickering = renderRate > flickerThreshold;
    }

    return {
      renderCount: renderCountRef.current,
      lastRenderTime: now,
      averageRenderInterval: averageInterval,
      isFlickering,
      componentName
    };
  };

  return {
    getCurrentMetrics,
    renderCount: renderCountRef.current
  };
}
