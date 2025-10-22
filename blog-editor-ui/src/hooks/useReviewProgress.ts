import { useState, useCallback } from 'react';

interface UseReviewProgressOptions {
  onDismiss?: () => void;
}

export const useReviewProgress = (options: UseReviewProgressOptions = {}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  const dismissProgress = useCallback(() => {
    setIsDismissed(true);
    options.onDismiss?.();
  }, [options]);

  const resetProgress = useCallback(() => {
    setIsDismissed(false);
  }, []);

  return {
    isDismissed,
    dismissProgress,
    resetProgress
  };
};
