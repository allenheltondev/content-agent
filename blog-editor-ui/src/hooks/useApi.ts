import { useState, useCallback, useRef, useEffect } from 'react';
import type { ApiError } from '../types';
import { getErrorMessage, logError } from '../utils/apiErrorHandler';

/**
 * State for API operations
 */
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Options for API operations
 */
interface ApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  logContext?: string;
}

/**
 * Hook for managing API call state and operations
 */
export function useApi<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null
  });

  // Keep track of the current request to handle cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute an API operation with proper error handling and loading states
   */
  const execute = useCallback(async <R = T>(
    apiCall: (signal?: AbortSignal) => Promise<R>,
    options: ApiOptions = {}
  ): Promise<R | null> => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      const result = await apiCall(abortController.signal);

      // Only update state if the request wasn't aborted
      if (!abortController.signal.aborted) {
        setState({
          data: result as T,
          loading: false,
          error: null
        });

        options.onSuccess?.(result);
      }

      return result;
    } catch (error) {
      // Don't update state if the request was aborted
      if (abortController.signal.aborted) {
        return null;
      }

      const errorMessage = getErrorMessage(error);

      setState({
        data: null,
        loading: false,
        error: errorMessage
      });

      // Log error for debugging
      if (options.logContext) {
        logError(error, options.logContext);
      }

      options.onError?.(error as ApiError);

      return null;
    } finally {
      // Clear the abort controller reference
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  /**
   * Reset the API state
   */
  const reset = useCallback(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({
      data: null,
      loading: false,
      error: null
    });
  }, []);

  /**
   * Clear only the error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    execute,
    reset,
    clearError
  };
}

/**
 * Hook specifically for API operations that don't need to store data in state
 * Useful for mutations like create, update, delete
 */
export function useApiMutation<T = any>() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutate = useCallback(async <R = T>(
    apiCall: (signal?: AbortSignal) => Promise<R>,
    options: ApiOptions = {}
  ): Promise<R | null> => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const result = await apiCall(abortController.signal);

      if (!abortController.signal.aborted) {
        setLoading(false);
        options.onSuccess?.(result);
      }

      return result;
    } catch (error) {
      if (abortController.signal.aborted) {
        return null;
      }

      const errorMessage = getErrorMessage(error);
      setLoading(false);
      setError(errorMessage);

      if (options.logContext) {
        logError(error, options.logContext);
      }

      options.onError?.(error as ApiError);
      return null;
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    loading,
    error,
    mutate,
    reset,
    clearError
  };
}
