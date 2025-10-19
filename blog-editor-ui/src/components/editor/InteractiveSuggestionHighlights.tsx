import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import type { Suggestion, SuggestionType } from '../../types';
import { useSuggestionScrollToActive } from '../../hooks/useScrollToActive';
interface InteractiveSuggestionHighlightsProps {
  suggestions: Suggestion[];
  activeSuggestionId: string | null;
  content: string;
  onHighlightClick: (suggestionId: string) => void;
  className?: string;
  enableScrollToActive?: boolean;
}

interface HighlightStyle {
  backgroundColor: string;
  borderColor: string;
  opacity: number;
  borderRadius: string;
  cursor: 'pointer' | 'default';
  transition: string;
}

interface InteractiveHighlight {
  id: string;
  suggestionId: string;
  startOffset: number;
  endOffset: number;
  isActive: boolean;
  isClickable: boolean;
  style: HighlightStyle;
  hoverStyle: HighlightStyle;
  activeStyle: HighlightStyle;
  onClick: (event?: React.MouseEvent) => void;
}

/**
 * Get color styles for suggestion type with active/inactive states
 */
const getSuggestionStyles = (type: SuggestionType, _isActive: boolean): {
  inactive: HighlightStyle;
  hover: HighlightStyle;
  active: HighlightStyle;
} => {
  const baseStyles = {
    llm: {
      inactive: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)', // blue-500 with low opacity
        borderColor: '#93c5fd', // blue-300
        opacity: 0.7,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      hover: {
        backgroundColor: 'rgba(59, 130, 246, 0.25)', // blue-500 with medium opacity
        borderColor: '#60a5fa', // blue-400
        opacity: 0.9,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      active: {
        backgroundColor: 'rgba(59, 130, 246, 0.35)', // blue-500 with high opacity
        borderColor: '#3b82f6', // blue-500
        opacity: 1,
        borderRadius: '4px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      }
    },
    brand: {
      inactive: {
        backgroundColor: 'rgba(147, 51, 234, 0.15)', // purple-500 with low opacity
        borderColor: '#c4b5fd', // purple-300
        opacity: 0.7,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      hover: {
        backgroundColor: 'rgba(147, 51, 234, 0.25)', // purple-500 with medium opacity
        borderColor: '#a855f7', // purple-400
        opacity: 0.9,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      active: {
        backgroundColor: 'rgba(147, 51, 234, 0.35)', // purple-500 with high opacity
        borderColor: '#9333ea', // purple-500
        opacity: 1,
        borderRadius: '4px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      }
    },
    fact: {
      inactive: {
        backgroundColor: 'rgba(249, 115, 22, 0.15)', // orange-500 with low opacity
        borderColor: '#fdba74', // orange-300
        opacity: 0.7,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      hover: {
        backgroundColor: 'rgba(249, 115, 22, 0.25)', // orange-500 with medium opacity
        borderColor: '#fb923c', // orange-400
        opacity: 0.9,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      active: {
        backgroundColor: 'rgba(249, 115, 22, 0.35)', // orange-500 with high opacity
        borderColor: '#f97316', // orange-500
        opacity: 1,
        borderRadius: '4px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      }
    },
    grammar: {
      inactive: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)', // green-500 with low opacity
        borderColor: '#86efac', // green-300
        opacity: 0.7,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      hover: {
        backgroundColor: 'rgba(34, 197, 94, 0.25)', // green-500 with medium opacity
        borderColor: '#4ade80', // green-400
        opacity: 0.9,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      active: {
        backgroundColor: 'rgba(34, 197, 94, 0.35)', // green-500 with high opacity
        borderColor: '#22c55e', // green-500
        opacity: 1,
        borderRadius: '4px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      }
    },
    spelling: {
      inactive: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)', // red-500 with low opacity
        borderColor: '#fca5a5', // red-300
        opacity: 0.7,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      hover: {
        backgroundColor: 'rgba(239, 68, 68, 0.25)', // red-500 with medium opacity
        borderColor: '#f87171', // red-400
        opacity: 0.9,
        borderRadius: '3px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      },
      active: {
        backgroundColor: 'rgba(239, 68, 68, 0.35)', // red-500 with high opacity
        borderColor: '#ef4444', // red-500
        opacity: 1,
        borderRadius: '4px',
        cursor: 'pointer' as const,
        transition: 'all 0.2s ease-in-out'
      }
    }
  };

  return baseStyles[type];
};

/**
 * InteractiveSuggestionHighlights component renders clickable highlights with distinct active states
 */
export const InteractiveSuggestionHighlights = ({
  suggestions,
  activeSuggestionId,
  content,
  onHighlightClick,
  className = '',
  enableScrollToActive = true
}: InteractiveSuggestionHighlightsProps) => {
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);
  const [lastClickedPosition, setLastClickedPosition] = useState<{ startOffset: number; endOffset: number; timestamp: number } | null>(null);
  const clickCycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize scroll-to-active functionality for highlight clicks
  const { scrollToActiveWithNavigation } = useSuggestionScrollToActive({
    delay: 100, // Quick scroll for immediate feedback
    offset: 80,
    visibilityMargin: 60
  });

  const getOverlappingSuggestions = useCallback((startOffset: number, endOffset: number): Suggestion[] => {
    return suggestions.filter(suggestion => {
      // Check if suggestions overlap
      return !(
        suggestion.endOffset <= startOffset ||
        suggestion.startOffset >= endOffset
      );
    });
  }, [suggestions]);
  
  // Process suggestions into interactive highlights
  const interactiveHighlights = useMemo(() => {
    if (!suggestions.length || !content) {
      return [];
    }

    // Filter valid suggestions
    const validSuggestions = suggestions.filter(suggestion => {
      const { startOffset, endOffset } = suggestion;
      return (
        startOffset >= 0 &&
        endOffset <= content.length &&
        startOffset < endOffset
      );
    });

    // Create interactive highlights
    return validSuggestions.map(suggestion => {
      const isActive = suggestion.id === activeSuggestionId;
      const styles = getSuggestionStyles(suggestion.type, isActive);

      const highlight: InteractiveHighlight = {
        id: suggestion.id,
        suggestionId: suggestion.id,
        startOffset: suggestion.startOffset,
        endOffset: suggestion.endOffset,
        isActive,
        isClickable: true,
        style: isActive ? styles.active : styles.inactive,
        hoverStyle: styles.hover,
        activeStyle: styles.active,
        onClick: (event?: React.MouseEvent) => handleHighlightClick(suggestion.id, event)
      };

      return highlight;
    });
  }, [suggestions, content, activeSuggestionId, onHighlightClick]);

  // Handle highlight hover
  const handleHighlightHover = useCallback((suggestionId: string) => {
    setHoveredSuggestion(suggestionId);
  }, []);

  // Handle highlight hover end
  const handleHighlightHoverEnd = useCallback(() => {
    setHoveredSuggestion(null);
  }, []);

  // Handle highlight click with proper suggestion ID mapping
  const handleHighlightClick = useCallback((suggestionId: string, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();

    // Find the clicked suggestion
    const clickedSuggestion = suggestions.find(s => s.id === suggestionId);
    if (!clickedSuggestion) {
      console.warn('Suggestion not found for click:', suggestionId);
      return;
    }

    const currentTime = Date.now();
    const { startOffset, endOffset } = clickedSuggestion;

    // Find all overlapping suggestions at this position
    const overlappingSuggestions = getOverlappingSuggestions(startOffset, endOffset);

    // If there are multiple overlapping suggestions, handle cycling
    if (overlappingSuggestions.length > 1) {
      // Check if this is a repeated click in the same area within a short time
      const isRepeatedClick = lastClickedPosition &&
        lastClickedPosition.startOffset === startOffset &&
        lastClickedPosition.endOffset === endOffset &&
        (currentTime - lastClickedPosition.timestamp) < 2000; // 2 second window for cycling

      if (isRepeatedClick && activeSuggestionId) {
        // Find current active suggestion in the overlapping list
        const currentIndex = overlappingSuggestions.findIndex(s => s.id === activeSuggestionId);

        if (currentIndex !== -1) {
          // Cycle to the next suggestion in the overlapping list
          const nextIndex = (currentIndex + 1) % overlappingSuggestions.length;
          const nextSuggestion = overlappingSuggestions[nextIndex];

          // Update last clicked position
          setLastClickedPosition({ startOffset, endOffset, timestamp: currentTime });

          // Call the parent handler with the next suggestion
          onHighlightClick(nextSuggestion.id);
          return;
        }
      }
    }

    // Default behavior: activate the clicked suggestion
    setLastClickedPosition({ startOffset, endOffset, timestamp: currentTime });

    // Clear any existing timeout
    if (clickCycleTimeoutRef.current) {
      clearTimeout(clickCycleTimeoutRef.current);
    }

    // Set timeout to clear the last clicked position after cycling window
    clickCycleTimeoutRef.current = setTimeout(() => {
      setLastClickedPosition(null);
    }, 2000);

    // Call the parent handler to change active suggestion
    onHighlightClick(suggestionId);

    // Scroll to the clicked suggestion if enabled
    if (enableScrollToActive) {
      // Small delay to allow state update before scrolling
      setTimeout(() => {
        scrollToActiveWithNavigation(suggestionId);
      }, 50);
    }
  }, [suggestions, onHighlightClick, activeSuggestionId, lastClickedPosition, getOverlappingSuggestions]);

  // Get suggestions that overlap with a given text position


  // Find suggestion by text position (for click mapping)
  // Note: helper retained for potential future use

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickCycleTimeoutRef.current) {
        clearTimeout(clickCycleTimeoutRef.current);
      }
    };
  }, []);

  // Check if a suggestion has overlapping suggestions
  const hasOverlappingSuggestions = useCallback((suggestion: Suggestion): boolean => {
    const overlapping = getOverlappingSuggestions(suggestion.startOffset, suggestion.endOffset);
    return overlapping.length > 1;
  }, [getOverlappingSuggestions]);

  // Create text segments for rendering
  const textSegments = useMemo(() => {
    if (!interactiveHighlights.length) {
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
      highlight?: InteractiveHighlight;
      startOffset: number;
      endOffset: number;
    }> = [];

    let currentOffset = 0;

    // Sort highlights by start offset for rendering
    const sortedHighlights = [...interactiveHighlights].sort((a, b) =>
      a.startOffset - b.startOffset
    );

    for (const highlight of sortedHighlights) {
      const { startOffset, endOffset } = highlight;

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
        highlight,
        startOffset,
        endOffset
      });

      currentOffset = endOffset;
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
  }, [interactiveHighlights, content]);

  return (
    <div className={`relative ${className}`}>
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {textSegments.map((segment, index) => {
          if (segment.type === 'highlight' && segment.highlight) {
            const { highlight } = segment;
            const isHovered = hoveredSuggestion === highlight.id;
            const isActive = highlight.isActive;
            const suggestion = suggestions.find(s => s.id === highlight.suggestionId);
            const hasOverlapping = suggestion ? hasOverlappingSuggestions(suggestion) : false;

            // Determine which style to use
            let currentStyle = highlight.style;
            if (isHovered && !isActive) {
              currentStyle = highlight.hoverStyle;
            } else if (isActive) {
              currentStyle = highlight.activeStyle;
            }

            return (
              <span
                key={`${highlight.id}-${index}`}
                className={`
                  suggestion-highlight relative inline-block transition-all duration-200 ease-in-out
                  border-b-2 border-dashed px-1 py-0.5
                  ${isActive ? 'shadow-md z-20 scale-105' : 'hover:scale-102'}
                  ${isHovered && !isActive ? 'shadow-sm z-10' : ''}
                  ${hasOverlapping ? 'border-double' : ''}
                  focus:outline-none focus:ring-2 focus:ring-opacity-50
                `}
                style={{
                  backgroundColor: currentStyle.backgroundColor,
                  borderColor: currentStyle.borderColor,
                  opacity: currentStyle.opacity,
                  borderRadius: currentStyle.borderRadius,
                  cursor: currentStyle.cursor,
                  transition: currentStyle.transition,
                  zIndex: isActive ? 20 : isHovered ? 10 : 5,
                  '--focus-ring-color': currentStyle.borderColor
                } as React.CSSProperties}
                onClick={(e) => highlight.onClick(e)}
                onMouseEnter={() => handleHighlightHover(highlight.id)}
                onMouseLeave={handleHighlightHoverEnd}
                tabIndex={0}
                role="button"
                aria-label={`${suggestions.find(s => s.id === highlight.suggestionId)?.type} suggestion: ${suggestions.find(s => s.id === highlight.suggestionId)?.reason}`}
                data-suggestion-id={highlight.suggestionId}
                data-suggestion-type={suggestions.find(s => s.id === highlight.suggestionId)?.type}
                data-start-offset={highlight.startOffset}
                data-end-offset={highlight.endOffset}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    highlight.onClick();
                  }
                }}
              >
                {segment.text}

                {/* Visual indicator for suggestion type and state */}
                <span
                  className={`
                    absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white shadow-sm
                    transition-all duration-200
                    ${isActive ? 'scale-150 shadow-md animate-pulse' :
                      isHovered ? 'scale-125' : 'scale-100'}
                  `}
                  style={{
                    backgroundColor: currentStyle.borderColor,
                    boxShadow: isActive ? `0 0 8px ${currentStyle.borderColor}40` : undefined
                  }}
                />

                {/* Active suggestion indicator */}
                {isActive && (
                  <span
                    className="absolute -top-2 -left-2 w-1 h-1 bg-white rounded-full shadow-lg animate-ping"
                    style={{
                      backgroundColor: currentStyle.borderColor
                    }}
                  />
                )}

                {/* Overlapping suggestions indicator */}
                {hasOverlapping && (
                  <span
                    className={`
                      absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white shadow-sm
                      flex items-center justify-center text-xs font-bold text-white
                      transition-all duration-200
                      ${isActive ? 'scale-125 animate-pulse' : isHovered ? 'scale-110' : 'scale-100'}
                    `}
                    style={{
                      backgroundColor: currentStyle.borderColor,
                      fontSize: '8px'
                    }}
                    title="Multiple suggestions available - click to cycle"
                  >
                    {getOverlappingSuggestions(highlight.startOffset, highlight.endOffset).length}
                  </span>
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
    </div>
  );
};
