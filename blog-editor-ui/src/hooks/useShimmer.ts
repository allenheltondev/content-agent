import { useMemo } from 'react';

export interface UseShimmerOptions {
  enabled?: boolean;
  duration?: number;
  delay?: number;
}

export const useShimmer = (options: UseShimmerOptions = {}) => {
  const {
    enabled = true,
    duration = 1.5,
    delay = 0,
  } = options;

  const shimmerClasses = useMemo(() => {
    if (!enabled) return '';

    return 'animate-shimmer';
  }, [enabled]);

  const shimmerStyle = useMemo(() => {
    if (!enabled) return {};

    return {
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
    };
  }, [enabled, duration, delay]);

  return {
    shimmerClasses,
    shimmerStyle,
    isEnabled: enabled,
  };
};
