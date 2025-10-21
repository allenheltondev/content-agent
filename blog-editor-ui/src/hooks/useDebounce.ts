import { useCallback, useRef } from 'react';

/**
 * Hook for debouncing function calls to prevent excessive API calls
 * and improve performance during rapid user interactions
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  return debouncedCallback;
}

/**
 * Hook for debouncing async function calls with cancellation support
 */
export function useAsyncDebounce<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number
): T & { cancel: () => void } {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedCallback = useCallback(
    async (...args: Parameters<T>) => {
      // Cancel previous call
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const currentController = abortControllerRef.current;

      return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            if (currentController.signal.aborted) {
              reject(new Error('Debounced call was cancelled'));
              return;
            }

            const result = await callback(...args);

            if (!currentController.signal.aborted) {
              resolve(result);
            }
          } catch (error) {
            if (!currentController.signal.aborted) {
              reject(error);
            }
          }
        }, delay);
      });
    },
    [callback, delay]
  ) as T;

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return Object.assign(debouncedCallback, { cancel });
}

/**
 * Hook for throttling function calls to limit execution frequency
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCallRef.current;

      if (timeSinceLastCall >= delay) {
        // Execute immediately
        lastCallRef.current = now;
        callback(...args);
      } else {
        // Schedule for later
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastCallRef.current = Date.now();
          callback(...args);
        }, delay - timeSinceLastCall);
      }
    },
    [callback, delay]
  ) as T;

  return throttledCallback;
}
