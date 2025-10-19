import { useState, useEffect, useMemo, useCallback } from 'react';

interface VirtualizedListOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualizedListResult<T> {
  visibleItems: Array<{
    item: T;
    index: number;
    style: React.CSSProperties;
  }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
}

/**
 * Custom hook for virtualizing large lists to improve performance
 * Only renders visible items plus a small buffer (overscan)
 */
export function useVirtualizedList<T>(
  items: T[],
  options: VirtualizedListOptions
): VirtualizedListResult<T> {
  const { itemHeight, containerHeight, overscan = 5 } = options;
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate which items should be visible
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Create visible items with positioning
  const visibleItems = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    const result = [];

    for (let i = startIndex; i <= endIndex; i++) {
      if (items[i]) {
        result.push({
          item: items[i],
          index: i,
          style: {
            position: 'absolute' as const,
            top: i * itemHeight,
            left: 0,
            right: 0,
            height: itemHeight,
          },
        });
      }
    }

    return result;
  }, [items, visibleRange, itemHeight]);

  // Total height for scrollbar
  const totalHeight = items.length * itemHeight;

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    const targetScrollTop = index * itemHeight;
    setScrollTop(targetScrollTop);
  }, [itemHeight]);

  // Handle scroll events (for future use)
  // const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
  //   setScrollTop(event.currentTarget.scrollTop);
  // }, []);

  return {
    visibleItems,
    totalHeight,
    scrollToIndex,
  };
}

/**
 * Hook for optimizing suggestion list rendering with large datasets
 */
export function useOptimizedSuggestionList<T>(
  suggestions: T[],
  containerRef: React.RefObject<HTMLDivElement>
) {
  const [shouldVirtualize, setShouldVirtualize] = useState(false);
  const [containerHeight, setContainerHeight] = useState(400);

  // Determine if we should virtualize based on number of items
  useEffect(() => {
    setShouldVirtualize(suggestions.length > 20);
  }, [suggestions.length]);

  // Update container height when ref changes
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [containerRef]);

  const virtualizedResult = useVirtualizedList(suggestions, {
    itemHeight: 80, // Approximate height of a suggestion item
    containerHeight,
    overscan: 3,
  });

  return {
    shouldVirtualize,
    ...virtualizedResult,
  };
}
