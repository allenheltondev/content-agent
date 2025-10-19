import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import type { Suggestion, SuggestionType } from '../../types';
import { useSuggestionCache } from '../../hooks/useSuggestionCache';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';

/**
 * Configuration for virtualized highlighting
 */
export interface VirtualizedHighlightConfig {
  /**
   * Number of suggestions to render at once
   */
  renderBatchSize?: number;

  /**
   * Threshold for enabling virtualization
   */
  virtualizationThreshold?: number;

  /**
   * Whether to enable intersection observer for visibility detection
   */
  enableIntersectionObserver?: boolean;

  /**
   * Root margin for intersection observer
   */
  intersectionRootMargin?: string;

  /**
   * Whether to enable debounced updates
   */
  enableDebouncing?: boolean;

  /**
   * Debounce delay for updates (ms)
   */
  debounceDelay?: number;
}

/**
 * Props for VirtualizedSuggestionHighlights
 */
export interface VirtualizedSuggestionHighlightsProps {
  suggestions: Suggestion[];
  activeSuggestionId: string | null;
  content: string;
  onHighlightClick: (suggestionId: string) => void;
  className?: string;
  config?: VirtualizedHighlightConfig;
  enableScrollToActive?: boolean;
}

/**
 * Virtualized highlight item
 */
interface VirtualizedHighlightItem {
  id: string;
  suggestionId: string;
  startOffset: number;
  endOffset: number;
  isActive: boolean;
  isVisible: boolean;
  priority: number; // Higher priority items are rendered first
  type: SuggestionType;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<VirtualizedHighlightConfig> = {
  renderBatchSize: 20,
  virtualizationThreshold: 50,
  enableIntersectionObserver: true,
  intersectionRootMargin: '100px',
  enableDebouncing: true,
  debounceDelay: 150
};

/**
 * Get suggestion type color for highlighting
 */
const getSuggestionTypeColor = (type: SuggestionType, isActive: boolean) => {
  const colors = {
    llm: isActive ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.15)',
    brand: isActive ? 'rgba(147, 51, 234, 0.35)' : 'rgba(147, 51, 234, 0.15)',
    fact: isActive ? 'rgba(249, 115, 22, 0.35)' : 'rgba(249, 115, 22, 0.15)',
    grammar: isActive ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.15)',
    spelling: isActive ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.15)'
  };
  return colors[type] || colors.llm;
};

/**
 * VirtualizedSuggestionHighlights provides optimized rendering for large suggestion sets
 */
export const VirtualizedSuggestionHighlights: React.FC<VirtualizedSuggestionHighlightsProps> = ({
  suggestions,
  activeSuggestionId,
  content,
  onHighlightClick,
  className = '',
  config = {},
  enableScrollToActive: _enableScrollToActive = true
}) => {
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config]);

  // Performance monitoring
  const { measureFunction, getMetrics } = usePerformanceMonitor({
    enabled: true,
    thresholds: {
      highlighting: 50,
      virtualization: 100,
      rendering: 30
    }
  });

  // Caching for expensive computations
  const { cacheSuggestionData, /* cacheHighlightBoundaries */ getStats } = useSuggestionCache({
    maxEntries: 100,
    ttl: 5 * 60 * 1000, // 5 minutes
    enableLRU: true
  });

  // State for virtualization
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [_renderOffset, _setRenderOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const intersectionObserverRef = useRef<IntersectionObserver | null>(null);

  // Debounced update state
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if virtualization should be enabled
  const shouldVirtualize = useMemo(() => {
    return suggestions.length > finalConfig.virtualizationThreshold;
  }, [suggestions.length, finalConfig.virtualizationThreshold]);

  // Process suggestions into virtualized items with caching
  const virtualizedItems = useMemo(() => {
    return measureFunction('highlighting', () => {
      if (!suggestions.length || !content) {
        return [];
      }

      // Use cached suggestion data
      const cachedData = cacheSuggestionData(suggestions, content);

      // Create virtualized items with priority
      const items: VirtualizedHighlightItem[] = cachedData.availableSuggestions.map((suggestion, _index) => {
        const isActive = suggestion.id === activeSuggestionId;

        // Calculate priority: active suggestion gets highest priority,
        // then by suggestion type importance, then by position in content
        let priority = 0;
        if (isActive) priority += 1000;

        // Type priority
        const typePriority = {
          spelling: 100,
          grammar: 90,
          fact: 80,
          brand: 70,
          llm: 60
        };
        priority += typePriority[suggestion.type] || 50;

        // Position priority (earlier in content = higher priority)
        priority += Math.max(0, 100 - (suggestion.startOffset / content.length) * 100);

        return {
          id: `highlight_${suggestion.id}`,
          suggestionId: suggestion.id,
          startOffset: suggestion.startOffset,
          endOffset: suggestion.endOffset,
          isActive,
          isVisible: true, // Will be updated by intersection observer
          priority,
          type: suggestion.type
        };
      });

      // Sort by priority (highest first)
      return items.sort((a, b) => b.priority - a.priority);
    });
  }, [suggestions, content, activeSuggestionId, cacheSuggestionData, measureFunction]);

  // Get items to render based on virtualization
  const itemsToRender = useMemo(() => {
    if (!shouldVirtualize) {
      return virtualizedItems;
    }

    // Render active suggestion and high-priority items first
    const activeItems = virtualizedItems.filter(item => item.isActive);
    const visibleHighPriorityItems = virtualizedItems
      .filter(item => !item.isActive && (visibleItems.has(item.id) || item.priority > 150))
      .slice(0, finalConfig.renderBatchSize - activeItems.length);

    return [...activeItems, ...visibleHighPriorityItems];
  }, [shouldVirtualize, virtualizedItems, visibleItems, finalConfig.renderBatchSize]);

  // Setup intersection observer for virtualization
  useEffect(() => {
    if (!shouldVirtualize || !finalConfig.enableIntersectionObserver || !containerRef.current) {
      return;
    }

    // Cleanup existing observer
    if (intersectionObserverRef.current) {
      intersectionObserverRef.current.disconnect();
    }

    // Create new intersection observer
    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        const updates = new Set<string>();

        entries.forEach(entry => {
          const itemId = entry.target.getAttribute('data-highlight-id');
          if (itemId) {
            if (entry.isIntersecting) {
              updates.add(itemId);
            }
          }
        });

        if (updates.size > 0) {
          // Debounce visibility updates
          if (finalConfig.enableDebouncing) {
            if (updateTimeoutRef.current) {
              clearTimeout(updateTimeoutRef.current);
            }

            updateTimeoutRef.current = setTimeout(() => {
              setVisibleItems(prev => new Set([...prev, ...updates]));
            }, finalConfig.debounceDelay);
          } else {
            setVisibleItems(prev => new Set([...prev, ...updates]));
          }
        }
      },
      {
        root: containerRef.current,
        rootMargin: finalConfig.intersectionRootMargin,
        threshold: 0.1
      }
    );

    return () => {
      if (intersectionObserverRef.current) {
        intersectionObserverRef.current.disconnect();
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [shouldVirtualize, finalConfig]);

  // Handle highlight click with performance measurement
  const handleHighlightClick = useCallback((suggestionId: string, event?: React.MouseEvent) => {
    measureFunction('interaction', () => {
      event?.preventDefault();
      event?.stopPropagation();
      onHighlightClick(suggestionId);
    });
  }, [onHighlightClick, measureFunction]);

  // Create text segments for rendering with caching
  const textSegments = useMemo(() => {
    return measureFunction('rendering', () => {
      if (!itemsToRender.length) {
        return [{
          text: content,
          type: 'text' as const,
          startOffset: 0,
          endOffset: content.length
        }];
      }

      const segments: Array<{
        text: string;
        type: 'text' | 'highlight';
        item?: VirtualizedHighlightItem;
        startOffset: number;
        endOffset: number;
      }> = [];

      let currentOffset = 0;

      // Sort items by start offset for rendering
      const sortedItems = [...itemsToRender].sort((a, b) => a.startOffset - b.startOffset);

      for (const item of sortedItems) {
        const { startOffset, endOffset } = item;

        // Add text before the highlight
        if (startOffset > currentOffset) {
          const textBefore = content.substring(currentOffset, startOffset);
          if (textBefore) {
            segments.push({
              text: textBefore,
              type: 'text',
              startOffset: currentOffset,
              endOffset: startOffset
            });
          }
        }

        // Add the highlight
        const highlightText = content.substring(startOffset, endOffset);
        segments.push({
          text: highlightText,
          type: 'highlight',
          item,
          startOffset,
          endOffset
        });

        currentOffset = Math.max(currentOffset, endOffset);
      }

      // Add remaining text after the last highlight
      if (currentOffset < content.length) {
        const remainingText = content.substring(currentOffset);
        segments.push({
          text: remainingText,
          type: 'text',
          startOffset: currentOffset,
          endOffset: content.length
        });
      }

      return segments;
    });
  }, [itemsToRender, content, measureFunction]);

  // Log performance metrics in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const perfMetrics = getMetrics();
        const cacheStats = getStats();

        if (perfMetrics.highlighting?.count > 0) {
          console.log('Virtualized Highlights Performance:', {
            performance: perfMetrics,
            cache: cacheStats,
            virtualization: {
              enabled: shouldVirtualize,
              totalItems: virtualizedItems.length,
              renderedItems: itemsToRender.length,
              visibleItems: visibleItems.size
            }
          });
        }
      }, 15000); // Log every 15 seconds

      return () => clearInterval(interval);
    }
  }, [getMetrics, getStats, shouldVirtualize, virtualizedItems.length, itemsToRender.length, visibleItems.size]);

  return (
    <div
      ref={containerRef}
      className={`virtualized-suggestion-highlights ${className}`}
      data-virtualized={shouldVirtualize}
      data-total-suggestions={suggestions.length}
      data-rendered-items={itemsToRender.length}
    >
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {textSegments.map((segment, index) => {
          if (segment.type === 'highlight' && segment.item) {
            const { item } = segment;
            const backgroundColor = getSuggestionTypeColor(item.type, item.isActive);

            return (
              <span
                key={`${item.id}-${index}`}
                className={`
                  suggestion-highlight relative inline transition-colors duration-200 ease-in-out
                  border-b-2 border-dashed cursor-pointer
                  ${item.isActive ? 'shadow-md z-20' : 'hover:shadow-sm z-10'}
                  focus:outline-none focus:ring-2 focus:ring-opacity-50
                `}
                style={{
                  backgroundColor,
                  borderColor: backgroundColor.replace('0.15)', '0.6)').replace('0.35)', '0.8)'),
                  zIndex: item.isActive ? 20 : 5,
                  boxDecorationBreak: 'clone',
                  WebkitBoxDecorationBreak: 'clone' as any
                }}
                onClick={(e) => handleHighlightClick(item.suggestionId, e)}
                tabIndex={0}
                role="button"
                aria-label={`${item.type} suggestion`}
                data-suggestion-id={item.suggestionId}
                data-suggestion-type={item.type}
                data-highlight-id={item.id}
                data-start-offset={item.startOffset}
                data-end-offset={item.endOffset}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleHighlightClick(item.suggestionId);
                  }
                }}
              >
                {segment.text}

                {/* Active suggestion indicator */}
                {item.isActive && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white shadow-sm animate-pulse"
                    style={{ backgroundColor: backgroundColor.replace('0.35)', '1)') }}
                  />
                )}
              </span>
            );
          }

          return (
            <span key={index} className="text-gray-900">
              {segment.text}
            </span>
          );
        })}
      </div>

      {/* Performance indicator for development */}
      {process.env.NODE_ENV === 'development' && shouldVirtualize && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded z-50">
          <div>Virtualized: {itemsToRender.length}/{virtualizedItems.length} items</div>
          <div>Visible: {visibleItems.size} items</div>
        </div>
      )}
    </div>
  );
};

VirtualizedSuggestionHighlights.displayName = 'VirtualizedSuggestionHighlights';
