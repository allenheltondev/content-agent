import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Positioning strategy for the active suggestion area
 */
export type PositioningStrategy = 'floating' | 'sidebar' | 'bottom' | 'adaptive';

/**
 * Viewport breakpoints for responsive positioning
 */
export interface ViewportBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  wide: number;
}

/**
 * Position configuration for different screen sizes
 */
export interface ResponsivePositionConfig {
  strategy: PositioningStrategy;
  width: string;
  maxWidth?: string;
  maxHeight: string;
  offset: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  zIndex: number;
}

/**
 * Configuration for responsive positioning
 */
export interface ResponsivePositioningConfig {
  breakpoints?: Partial<ViewportBreakpoints>;
  positions?: {
    mobile?: Partial<ResponsivePositionConfig>;
    tablet?: Partial<ResponsivePositionConfig>;
    desktop?: Partial<ResponsivePositionConfig>;
    wide?: Partial<ResponsivePositionConfig>;
  };
  avoidElements?: string[]; // CSS selectors of elements to avoid overlapping
  minClearance?: number; // Minimum clearance from viewport edges (in pixels)
  updateThrottleMs?: number; // Throttle resize updates (in milliseconds)
}

/**
 * Current viewport information
 */
export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'wide';
  orientation: 'portrait' | 'landscape';
}

/**
 * Positioning result
 */
export interface PositioningResult {
  strategy: PositioningStrategy;
  styles: React.CSSProperties;
  className: string;
  viewport: ViewportInfo;
  isFloating: boolean;
  shouldAvoidOverlap: boolean;
}

/**
 * Default breakpoints
 */
const DEFAULT_BREAKPOINTS: ViewportBreakpoints = {
  mobile: 640,   // sm
  tablet: 768,   // md
  desktop: 1024, // lg
  wide: 1280     // xl
};

/**
 * Default position configurations
 */
const DEFAULT_POSITIONS: Record<'mobile' | 'tablet' | 'desktop' | 'wide', ResponsivePositionConfig> = {
  mobile: {
    strategy: 'bottom',
    width: '100%',
    maxHeight: '40vh',
    offset: { bottom: '0' },
    zIndex: 40
  },
  tablet: {
    strategy: 'bottom',
    width: '100%',
    maxHeight: '35vh',
    offset: { bottom: '0' },
    zIndex: 40
  },
  desktop: {
    strategy: 'floating',
    width: '400px',
    maxWidth: '90vw',
    maxHeight: '60vh',
    offset: { top: '80px', right: '20px' },
    zIndex: 50
  },
  wide: {
    strategy: 'floating',
    width: '450px',
    maxWidth: '25vw',
    maxHeight: '70vh',
    offset: { top: '80px', right: '40px' },
    zIndex: 50
  }
};

/**
 * Hook for responsive positioning of the ActiveSuggestionArea
 */
export function useResponsivePositioning(config: ResponsivePositioningConfig = {}) {
  const {
    breakpoints = {},
    positions = {},
    avoidElements = [],
    minClearance = 20,
    updateThrottleMs = 150
  } = config;

  const finalBreakpoints = { ...DEFAULT_BREAKPOINTS, ...breakpoints };
  const finalPositions = {
    mobile: { ...DEFAULT_POSITIONS.mobile, ...(positions.mobile || {}) },
    tablet: { ...DEFAULT_POSITIONS.tablet, ...(positions.tablet || {}) },
    desktop: { ...DEFAULT_POSITIONS.desktop, ...(positions.desktop || {}) },
    wide: { ...DEFAULT_POSITIONS.wide, ...(positions.wide || {}) }
  };

  const [viewport, setViewport] = useState<ViewportInfo>(() => getViewportInfo());
  const [positioning, setPositioning] = useState<PositioningResult>(() =>
    calculatePositioning(viewport, finalPositions, avoidElements, minClearance)
  );

  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get current viewport information
   */
  function getViewportInfo(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;

    let breakpoint: ViewportInfo['breakpoint'];
    if (width < finalBreakpoints.mobile) {
      breakpoint = 'mobile';
    } else if (width < finalBreakpoints.tablet) {
      breakpoint = 'tablet';
    } else if (width < finalBreakpoints.desktop) {
      breakpoint = 'desktop';
    } else {
      breakpoint = 'wide';
    }

    return {
      width,
      height,
      breakpoint,
      orientation: width > height ? 'landscape' : 'portrait'
    };
  }

  /**
   * Calculate positioning based on viewport and configuration
   */
  function calculatePositioning(
    viewportInfo: ViewportInfo,
    positionConfigs: typeof finalPositions,
    avoidSelectors: string[],
    clearance: number
  ): PositioningResult {
    const config = positionConfigs[viewportInfo.breakpoint];
    const isFloating = config.strategy === 'floating';

    // Base styles from configuration
    const baseStyles: React.CSSProperties = {
      width: config.width,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
      zIndex: config.zIndex
    };

    // Position-specific styles
    let positionStyles: React.CSSProperties = {};
    let className = '';

    switch (config.strategy) {
      case 'floating':
        positionStyles = {
          position: 'fixed',
          ...config.offset
        };
        className = 'fixed';
        break;

      case 'bottom':
        positionStyles = {
          position: 'relative',
          width: '100%',
          marginTop: '1rem'
        };
        className = 'relative w-full mt-4';
        break;

      case 'sidebar':
        positionStyles = {
          position: 'relative',
          width: config.width,
          maxHeight: config.maxHeight
        };
        className = 'relative';
        break;

      case 'adaptive':
        // Adaptive positioning based on available space
        const adaptiveResult = calculateAdaptivePosition(
          viewportInfo,
          avoidSelectors,
          clearance,
          config
        );
        positionStyles = adaptiveResult.styles;
        className = adaptiveResult.className;
        break;
    }

    // Check for overlapping elements and adjust if needed
    const shouldAvoidOverlap = isFloating && avoidSelectors.length > 0;
    if (shouldAvoidOverlap) {
      const adjustedStyles = avoidElementOverlap(
        { ...baseStyles, ...positionStyles },
        avoidSelectors,
        clearance
      );
      positionStyles = { ...positionStyles, ...adjustedStyles };
    }

    return {
      strategy: config.strategy,
      styles: { ...baseStyles, ...positionStyles },
      className,
      viewport: viewportInfo,
      isFloating,
      shouldAvoidOverlap
    };
  }

  /**
   * Calculate adaptive positioning based on available space
   */
  function calculateAdaptivePosition(
    viewportInfo: ViewportInfo,
    _avoidSelectors: string[],
    clearance: number,
    _config: ResponsivePositionConfig
  ): { styles: React.CSSProperties; className: string } {
    const { width, height } = viewportInfo;

    // Check available space on the right side
    const rightSpace = width - 400; // Assume content takes 400px minimum

    if (rightSpace >= 420) {
      // Enough space for floating on the right
      return {
        styles: {
          position: 'fixed',
          top: '80px',
          right: `${clearance}px`,
          width: '400px',
          maxHeight: `${height - 160}px`
        },
        className: 'fixed'
      };
    } else if (height > 600) {
      // Use bottom positioning for smaller screens with sufficient height
      return {
        styles: {
          position: 'relative',
          width: '100%',
          marginTop: '1rem',
          maxHeight: '300px'
        },
        className: 'relative w-full mt-4'
      };
    } else {
      // Fallback to compact floating
      return {
        styles: {
          position: 'fixed',
          top: '60px',
          right: `${clearance}px`,
          width: `${Math.min(350, width - clearance * 2)}px`,
          maxHeight: `${height - 120}px`
        },
        className: 'fixed'
      };
    }
  }

  /**
   * Avoid overlapping with specified elements
   */
  function avoidElementOverlap(
    currentStyles: React.CSSProperties,
    avoidSelectors: string[],
    clearance: number
  ): Partial<React.CSSProperties> {
    const adjustments: Partial<React.CSSProperties> = {};

    for (const selector of avoidSelectors) {
      const element = document.querySelector(selector);
      if (!element) continue;

      const rect = element.getBoundingClientRect();

      // Check if current position would overlap
      const currentTop = parseInt(String(currentStyles.top || '0'));
      const currentRight = parseInt(String(currentStyles.right || '0'));

      // Simple overlap detection and adjustment
      if (
        currentTop < rect.bottom + clearance &&
        currentTop + 300 > rect.top - clearance && // Assume 300px height
        window.innerWidth - currentRight - 400 < rect.right + clearance // Assume 400px width
      ) {
        // Move below the overlapping element
        adjustments.top = `${rect.bottom + clearance}px`;
      }
    }

    return adjustments;
  }

  /**
   * Handle viewport changes with throttling
   */
  const handleViewportChange = useCallback(() => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    throttleTimeoutRef.current = setTimeout(() => {
      const newViewport = getViewportInfo();
      setViewport(newViewport);

      const newPositioning = calculatePositioning(
        newViewport,
        finalPositions,
        avoidElements,
        minClearance
      );
      setPositioning(newPositioning);
    }, updateThrottleMs);
  }, [finalPositions, avoidElements, minClearance, updateThrottleMs]);

  /**
   * Force recalculation of positioning
   */
  const recalculatePositioning = useCallback(() => {
    const newViewport = getViewportInfo();
    setViewport(newViewport);

    const newPositioning = calculatePositioning(
      newViewport,
      finalPositions,
      avoidElements,
      minClearance
    );
    setPositioning(newPositioning);
  }, [finalPositions, avoidElements, minClearance]);

  /**
   * Check if current positioning strategy is optimal
   */
  const isPositioningOptimal = useCallback((): boolean => {
    if (!positioning.isFloating) return true;

    // Check if floating element is within viewport bounds
    const styles = positioning.styles;
    const top = parseInt(String(styles.top || '0'));
    const right = parseInt(String(styles.right || '0'));
    const width = parseInt(String(styles.width || '400'));
    const height = parseInt(String(styles.maxHeight || '300'));

    return (
      top >= 0 &&
      top + height <= viewport.height &&
      right >= 0 &&
      window.innerWidth - right - width >= 0
    );
  }, [positioning, viewport]);

  // Set up viewport change listeners
  useEffect(() => {
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);

      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [handleViewportChange]);

  // Recalculate when avoid elements meaningfully change
  // Avoid referential loops by tracking a stable key
  const avoidElementsKey = JSON.stringify(avoidElements || []);
  useEffect(() => {
    recalculatePositioning();
    // Intentionally do not depend on recalculatePositioning to avoid identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avoidElementsKey, minClearance]);

  return {
    positioning,
    viewport,
    recalculatePositioning,
    isPositioningOptimal,

    // Utility functions
    getViewportInfo,

    // Configuration
    breakpoints: finalBreakpoints,
    positions: finalPositions
  };
}

/**
 * Hook specifically for ActiveSuggestionArea responsive positioning
 */
export function useActiveSuggestionAreaPositioning(customConfig: ResponsivePositioningConfig = {}) {
  const config: ResponsivePositioningConfig = {
    avoidElements: [
      '.app-header',
      '.editor-header',
      '.content-summary',
      '.editor-actions'
    ],
    minClearance: 20,
    updateThrottleMs: 100,
    ...customConfig
  };

  return useResponsivePositioning(config);
}
