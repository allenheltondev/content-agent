import { useState, useCallback, useRef, useEffect, useMemo } from 'react';

/**
 * Transition states for suggestion changes
 */
export type TransitionState = 'idle' | 'entering' | 'active' | 'exiting' | 'processing';

/**
 * Transition configuration
 */
export interface TransitionConfig {
  /**
   * Duration of enter transition (ms)
   */
  enterDuration?: number;

  /**
   * Duration of exit transition (ms)
   */
  exitDuration?: number;

  /**
   * Duration of processing state (ms)
   */
  processingDuration?: number;

  /**
   * Easing function for transitions
   */
  easing?: string

  /**
   * Whether to use fade transitions
   */
  enableFade?: boolean;

  /**
   * Whether to use slide transitions
   */
  enableSlide?: boolean;

  /**
   * Whether to use scale transitions
   */
  enableScale?: boolean;

  /**
   * Whether to stagger content transitions
   */
  enableStagger?: boolean;

  /**
   * Stagger delay between elements (ms)
   */
  staggerDelay?: number;
}

/**
 * Transition state information
 */
export interface TransitionStateInfo {
  state: TransitionState;
  isTransitioning: boolean;
  progress: number; // 0-1
  direction: 'forward' | 'backward' | 'none';
}

/**
 * Suggestion change event
 */
export interface SuggestionChangeEvent {
  previousId: string | null;
  currentId: string | null;
  direction: 'forward' | 'backward' | 'none';
  trigger: 'navigation' | 'click' | 'resolution' | 'auto';
}

/**
 * Default transition configuration
 */
const DEFAULT_CONFIG: Required<TransitionConfig> = {
  enterDuration: 300,
  exitDuration: 200,
  processingDuration: 500,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  enableFade: true,
  enableSlide: true,
  enableScale: false,
  enableStagger: true,
  staggerDelay: 50
};

/**
 * Hook for managing smooth transitions between suggestions
 */
export function useSuggestionTransitions(config: TransitionConfig = {}) {
  // Memoize merged config to prevent callback identity churn and loops
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [
    config.enterDuration,
    config.exitDuration,
    config.processingDuration,
    config.easing,
    config.enableFade,
    config.enableSlide,
    config.enableScale,
    config.enableStagger,
    config.staggerDelay
  ]);

  const [transitionState, setTransitionState] = useState<TransitionStateInfo>({
    state: 'idle',
    isTransitioning: false,
    progress: 0,
    direction: 'none'
  });

  const [currentSuggestionId, setCurrentSuggestionId] = useState<string | null>(null);
  const [previousSuggestionId, setPreviousSuggestionId] = useState<string | null>(null);

  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const staggerTimeoutsRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  /**
   * Clear all active timeouts
   */
  const clearTimeouts = useCallback(() => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    if (progressIntervalRef.current) {
      clearTimeout(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    staggerTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    staggerTimeoutsRef.current = [];
  }, []);

  /**
   * Update transition progress
   */
  const updateProgress = useCallback((startTime: number, duration: number) => {
    const updateProgressFrame = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      setTransitionState(prev => ({
        ...prev,
        progress
      }));

      if (progress < 1) {
        progressIntervalRef.current = setTimeout(updateProgressFrame, 16); // ~60fps
      }
    };

    updateProgressFrame();
  }, []);

  /**
   * Start a transition to a new suggestion
   */
  const startTransition = useCallback((
    newSuggestionId: string | null,
    direction: 'forward' | 'backward' | 'none' = 'none',
    _trigger: SuggestionChangeEvent['trigger'] = 'navigation'
  ) => {
    clearTimeouts();

    const previousId = currentSuggestionId;
    setPreviousSuggestionId(previousId);

    // Start with exiting state if there's a current suggestion
    if (previousId && previousId !== newSuggestionId) {
      setTransitionState({
        state: 'exiting',
        isTransitioning: true,
        progress: 0,
        direction
      });

      const startTime = Date.now();
      updateProgress(startTime, finalConfig.exitDuration);

      // After exit duration, start entering new suggestion
      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentSuggestionId(newSuggestionId);

        if (newSuggestionId) {
          setTransitionState({
            state: 'entering',
            isTransitioning: true,
            progress: 0,
            direction
          });

          const enterStartTime = Date.now();
          updateProgress(enterStartTime, finalConfig.enterDuration);

          // After enter duration, set to active
          transitionTimeoutRef.current = setTimeout(() => {
            setTransitionState({
              state: 'active',
              isTransitioning: false,
              progress: 1,
              direction: 'none'
            });
          }, finalConfig.enterDuration);
        } else {
          // No new suggestion, go to idle
          setTransitionState({
            state: 'idle',
            isTransitioning: false,
            progress: 0,
            direction: 'none'
          });
        }
      }, finalConfig.exitDuration);
    } else if (newSuggestionId && !previousId) {
      // No previous suggestion, directly enter
      setCurrentSuggestionId(newSuggestionId);
      setTransitionState({
        state: 'entering',
        isTransitioning: true,
        progress: 0,
        direction
      });

      const startTime = Date.now();
      updateProgress(startTime, finalConfig.enterDuration);

      transitionTimeoutRef.current = setTimeout(() => {
        setTransitionState({
          state: 'active',
          isTransitioning: false,
          progress: 1,
          direction: 'none'
        });
      }, finalConfig.enterDuration);
    } else if (!newSuggestionId) {
      // Clearing suggestion
      setCurrentSuggestionId(null);
      setTransitionState({
        state: 'idle',
        isTransitioning: false,
        progress: 0,
        direction: 'none'
      });
    } else {
      // Same suggestion, no transition needed
      setTransitionState({
        state: 'active',
        isTransitioning: false,
        progress: 1,
        direction: 'none'
      });
    }
  }, [currentSuggestionId, finalConfig, clearTimeouts, updateProgress]);

  /**
   * Start processing state (for suggestion resolution)
   */
  const startProcessing = useCallback(() => {
    clearTimeouts();

    setTransitionState({
      state: 'processing',
      isTransitioning: true,
      progress: 0,
      direction: 'none'
    });

    const startTime = Date.now();
    updateProgress(startTime, finalConfig.processingDuration);

    transitionTimeoutRef.current = setTimeout(() => {
      setTransitionState(prev => ({
        ...prev,
        state: 'active',
        isTransitioning: false,
        progress: 1
      }));
    }, finalConfig.processingDuration);
  }, [finalConfig.processingDuration, clearTimeouts, updateProgress]);

  /**
   * Get CSS classes for current transition state
   */
  const getTransitionClasses = useCallback(() => {
    const classes: string[] = [];

    // Base transition class
    classes.push('suggestion-transition');

    // State-specific classes
    classes.push(`transition-${transitionState.state}`);

    // Direction classes
    if (transitionState.direction !== 'none') {
      classes.push(`transition-${transitionState.direction}`);
    }

    // Feature classes
    if (finalConfig.enableFade) classes.push('transition-fade');
    if (finalConfig.enableSlide) classes.push('transition-slide');
    if (finalConfig.enableScale) classes.push('transition-scale');
    if (finalConfig.enableStagger) classes.push('transition-stagger');

    return classes.join(' ');
  }, [transitionState, finalConfig]);

  /**
   * Get CSS styles for current transition state
   */
  const getTransitionStyles = useCallback((): React.CSSProperties => {
    const styles: React.CSSProperties = {
      transitionDuration: `${finalConfig.enterDuration}ms`,
      transitionTimingFunction: finalConfig.easing
    };

    // Apply state-specific styles
    switch (transitionState.state) {
      case 'entering':
        if (finalConfig.enableFade) {
          styles.opacity = transitionState.progress;
        }
        if (finalConfig.enableSlide) {
          const translateX = (1 - transitionState.progress) * 20;
          styles.transform = `translateX(${transitionState.direction === 'forward' ? translateX : -translateX}px)`;
        }
        if (finalConfig.enableScale) {
          const scale = 0.95 + (transitionState.progress * 0.05);
          styles.transform = `${styles.transform || ''} scale(${scale})`;
        }
        break;

      case 'exiting':
        if (finalConfig.enableFade) {
          styles.opacity = 1 - transitionState.progress;
        }
        if (finalConfig.enableSlide) {
          const translateX = transitionState.progress * 20;
          styles.transform = `translateX(${transitionState.direction === 'forward' ? -translateX : translateX}px)`;
        }
        if (finalConfig.enableScale) {
          const scale = 1 - (transitionState.progress * 0.05);
          styles.transform = `${styles.transform || ''} scale(${scale})`;
        }
        break;

      case 'processing':
        styles.opacity = 0.7;
        if (finalConfig.enableScale) {
          styles.transform = 'scale(0.98)';
        }
        break;

      case 'active':
        styles.opacity = 1;
        styles.transform = 'none';
        break;

      case 'idle':
        styles.opacity = 0;
        styles.transform = 'translateY(10px)';
        break;
    }

    return styles;
  }, [transitionState, finalConfig]);

  /**
   * Get staggered animation delay for child elements
   */
  const getStaggerDelay = useCallback((index: number): number => {
    if (!finalConfig.enableStagger) return 0;
    return index * finalConfig.staggerDelay;
  }, [finalConfig.enableStagger, finalConfig.staggerDelay]);

  /**
   * Apply staggered animations to child elements
   */
  const applyStaggeredAnimations = useCallback((containerSelector: string) => {
    if (!finalConfig.enableStagger) return;

    const container = document.querySelector(containerSelector);
    if (!container) return;

    const children = container.querySelectorAll('.stagger-item');

    children.forEach((child, index) => {
      const delay = getStaggerDelay(index);
      const timeout = setTimeout(() => {
        (child as HTMLElement).style.animationDelay = `${delay}ms`;
        child.classList.add('stagger-animate');
      }, delay);

      staggerTimeoutsRef.current.push(timeout);
    });
  }, [finalConfig.enableStagger, getStaggerDelay]);

  /**
   * Reset transition state
   */
  const resetTransition = useCallback(() => {
    clearTimeouts();
    setTransitionState({
      state: 'idle',
      isTransitioning: false,
      progress: 0,
      direction: 'none'
    });
    setCurrentSuggestionId(null);
    setPreviousSuggestionId(null);
  }, [clearTimeouts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    // State
    transitionState,
    currentSuggestionId,
    previousSuggestionId,

    // Actions
    startTransition,
    startProcessing,
    resetTransition,

    // Styling helpers
    getTransitionClasses,
    getTransitionStyles,
    getStaggerDelay,
    applyStaggeredAnimations,

    // Configuration
    config: finalConfig
  };
}

/**
 * Hook specifically for ActiveSuggestionArea transitions
 */
export function useActiveSuggestionTransitions(config: TransitionConfig = {}) {
  const transitionConfig: TransitionConfig = {
    enterDuration: 250,
    exitDuration: 200,
    processingDuration: 400,
    enableFade: true,
    enableSlide: true,
    enableScale: false,
    enableStagger: true,
    staggerDelay: 75,
    ...config
  };

  return useSuggestionTransitions(transitionConfig);
}
