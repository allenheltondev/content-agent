import { useMemo, useCallback, useState, useRef } from 'react';
import type { Suggestion, SuggestionType } from '../../types';
import { getSuggestionAccessibleLabel, announceToScreenReader } from '../../utils/suggestionAccessibility';

interface SuggestionHighlightOverlayProps {
  suggestions: Suggestion[];
  content: string;
  onSuggestionClick?: (suggestionId: string) => void;
  onSuggestionExpand?: (suggestionId: string) => void;
  className?: string;
}

interface HighlightStyle {
  backgroundColor: string;
  borderColor: string;
  opacity: number;
  zIndex: number;
}

interface HighlightPosition {
  startOffset: number;
  endOffset: number;
  top: number;
  left: number;
  width: number;
  height: number;
}

interface ProcessedHighlight {
  id: string;
  suggestion: Suggestion;
  text: string;
  style: HighlightStyle;
  position: HighlightPosition;
  priority: number;
}

/**
 * Get color classes and styles for suggestion type
 */
const getSuggestionColors = (type: SuggestionType): HighlightStyle => {
  const colorMap = {
    llm: {
      backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue-500 with opacity
      borderColor: '#60a5fa', // blue-400
      opacity: 0.8,
      zIndex: 100
    },
    brand: {
      backgroundColor: 'rgba(147, 51, 234, 0.2)', // purple-500 with opacity
      borderColor: '#a855f7', // purple-400
      opacity: 0.8,
      zIndex: 101
    },
    fact: {
      backgroundColor: 'rgba(249, 115, 22, 0.2)', // orange-500 with opacity
      borderColor: '#fb923c', // orange-400
      opacity: 0.8,
      zIndex: 102
    },
    grammar: {
      backgroundColor: 'rgba(34, 197, 94, 0.2)', // green-500 with opacity
      borderColor: '#4ade80', // green-400
      opacity: 0.8,
      zIndex: 103
    },
    spelling: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)', // red-500 with opacity
      borderColor: '#f87171', // red-400
      opacity: 0.8,
      zIndex: 104
    }
  };

  return colorMap[type];
};

/**
 * Get priority value for suggestiogher number = higher priority)
 */
const getSuggestionPriority = (suggestion: Suggestion): number => {
  const typePriority = {
    spelling: 5,
    grammar: 4,
    fact: 3,
    brand: 2,
    llm: 1
  };

  const priorityMultiplier = {
    high: 3,
    medium: 2,
    low: 1
  };

  return typePriority[suggestion.type] * priorityMultiplier[suggestion.priority];
};

/**
 * SuggestionHighlightOverlay component renders color-coded highlights over editor text
 */
export const SuggestionHighlightOverlay = ({
  suggestions,
  content,
  onSuggestionClick,
  onSuggestionExpand,
  className = ''
}: SuggestionHighlightOverlayProps) => {
  const [hoveredSuggestion, setHoveredSuggestion] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Process suggestions and create highlights
  const processedHighlights = useMemo(() => {
    if (!suggestions.length || !content) {
      return [];
    }

    // Filter valid suggestions and sort by priority
    const validSuggestions = suggestions
      .filter(suggestion => {
        const { startOffset, endOffset } = suggestion;
        return (
          startOffset >= 0 &&
          endOffset <= content.length &&
          startOffset < endOffset
        );
      })
      .sort((a, b) => getSuggestionPriority(b) - getSuggestionPriority(a));

    // Handle overlapping suggestions by keeping the highest priority one
    const nonOverlappingSuggestions: Suggestion[] = [];

    for (const suggestion of validSuggestions) {
      const hasOverlap = nonOverlappingSuggestions.some(existing => {
        return !(
          suggestion.endOffset <= existing.startOffset ||
          suggestion.startOffset >= existing.endOffset
        );
      });

      if (!hasOverlap) {
        nonOverlappingSuggestions.push(suggestion);
      }
    }

    // Create processed highlights
    return nonOverlappingSuggestions.map(suggestion => {
      const text = content.substring(suggestion.startOffset, suggestion.endOffset);
      const style = getSuggestionColors(suggestion.type);
      const priority = getSuggestionPriority(suggestion);

      return {
        id: suggestion.id,
        suggestion,
        text,
        style,
        position: {
          startOffset: suggestion.startOffset,
          endOffset: suggestion.endOffset,
          top: 0, // Will be calculated dynamically
          left: 0, // Will be calculated dynamically
          width: 0, // Will be calculated dynamically
          height: 0 // Will be calculated dynamically
        },
        priority
      };
    });
  }, [suggestions, content]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestionId: string) => {
    const suggestion = processedHighlights.find(h => h.id === suggestionId)?.suggestion;

    if (onSuggestionClick) {
      onSuggestionClick(suggestionId);
    }
    if (onSuggestionExpand) {
      onSuggestionExpand(suggestionId);
    }

    // Announce to screen readers
    if (suggestion) {
      announceToScreenReader(`Navigating to ${suggestion.type} suggestion in sidebar`, 'polite');
    }
  }, [onSuggestionClick, onSuggestionExpand, processedHighlights]);

  // Handle suggestion hover
  const handleSuggestionHover = useCallback((suggestionId: string, event: React.MouseEvent) => {
    setHoveredSuggestion(suggestionId);

    // Calculate tooltip position
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const tooltipWidth = 320; // Estimated tooltip width
    const tooltipHeight = 200; // Estimated tooltip height

    let top = rect.bottom + 8;
    let left = rect.left;

    // Adjust if tooltip would go off-screen
    if (top + tooltipHeight > window.innerHeight) {
      top = rect.top - tooltipHeight - 8;
    }

    if (left + tooltipWidth > window.innerWidth) {
      left = window.innerWidth - tooltipWidth - 16;
    }

    if (left < 16) {
      left = 16;
    }

    setTooltipPosition({ top, left });
  }, []);

  // Handle suggestion hover end
  const handleSuggestionHoverEnd = useCallback(() => {
    // Delay hiding tooltip to allow interaction
    setTimeout(() => {
      if (!tooltipRef.current?.matches(':hover')) {
        setHoveredSuggestion(null);
      }
    }, 100);
  }, []);

  // Handle tooltip hover
  const handleTooltipHover = useCallback(() => {
    // Keep tooltip visible when hovering over it
  }, []);

  // Handle tooltip hover end
  const handleTooltipHoverEnd = useCallback(() => {
    setHoveredSuggestion(null);
  }, []);

  // Create text segments for rendering
  const textSegments = useMemo(() => {
    if (!processedHighlights.length) {
      return [{ text: content, type: 'text' as const, startOffset: 0, endOffset: content.length }];
    }

    const segments: Array<{
      text: string;
      type: 'text' | 'highlight';
      highlight?: ProcessedHighlight;
      startOffset: number;
      endOffset: number;
    }> = [];

    let currentOffset = 0;

    // Sort highlights by start offset for rendering
    const sortedHighlights = [...processedHighlights].sort((a, b) =>
      a.position.startOffset - b.position.startOffset
    );

    for (const highlight of sortedHighlights) {
      const { startOffset, endOffset } = highlight.position;

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
      segments.push({
        text: highlight.text,
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
  }, [processedHighlights, content]);

  // Get hovered suggestion for tooltip
  const hoveredSuggestionData = hoveredSuggestion
    ? processedHighlights.find(h => h.id === hoveredSuggestion)?.suggestion
    : null;

  return (
    <div className={`relative ${className}`}>
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {textSegments.map((segment, index) => {
          if (segment.type === 'highlight' && segment.highlight) {
            const { highlight } = segment;
            const { style } = highlight;
            const isHovered = hoveredSuggestion === highlight.id;

            return (
              <span
                key={`${highlight.id}-${index}`}
                className={`suggestion-highlight relative inline-block cursor-pointer transition-all duration-300 ease-out border-b-2 border-dashed rounded-sm px-1 py-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-50 pointer-events-auto ${isHovered ? 'scale-105 shadow-lg z-20' : 'hover:scale-102'}`}
                style={{
                  backgroundColor: style.backgroundColor,
                  borderColor: style.borderColor,
                  opacity: style.opacity,
                  zIndex: isHovered ? 20 : style.zIndex,
                  '--focus-ring-color': style.borderColor
                } as React.CSSProperties}
                onClick={() => handleSuggestionClick(highlight.id)}
                onMouseEnter={(e) => handleSuggestionHover(highlight.id, e)}
                onMouseLeave={handleSuggestionHoverEnd}
                tabIndex={0}
                role="button"
                aria-label={getSuggestionAccessibleLabel(highlight.suggestion)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSuggestionClick(highlight.id);
                  }
                }}
              >
                {segment.text}

                {/* Small indicator for suggestion type */}
                <span
                  className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white shadow-sm transition-all duration-300 ${isHovered ? 'scale-150 shadow-md animate-pulse' : 'hover:scale-125'}`}
                  style={{
                    backgroundColor: style.borderColor,
                    boxShadow: isHovered ? `0 0 8px ${style.borderColor}40` : undefined
                  }}
                />
              </span>
            );
          }

          return (
            <span key={index} className="text-gray-900 pointer-events-none">
              {segment.text}
            </span>
          );
        })}
      </div>

      {/* Hover tooltip */}
      {hoveredSuggestionData && (
        <div
          ref={tooltipRef}
          className="fixed z-50 animate-scale-in"
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            zIndex: 9999
          }}
          onMouseEnter={handleTooltipHover}
          onMouseLeave={handleTooltipHoverEnd}
        >
          <SuggestionTooltip suggestion={hoveredSuggestionData} />
        </div>
      )}
    </div>
  );
};

/**
 * Get type display name
 */
const getTypeDisplayName = (type: SuggestionType): string => {
  const nameMap = {
    llm: 'Writing Enhancement',
    brand: 'Brand Guidelines',
    fact: 'Fact Check',
    grammar: 'Grammar',
    spelling: 'Spelling'
  };

  return nameMap[type];
};

/**
 * SuggestionTooltip component for hover previews
 */
interface SuggestionTooltipProps {
  suggestion: Suggestion;
}

const SuggestionTooltip = ({ suggestion }: SuggestionTooltipProps) => {
  const colors = getSuggestionColors(suggestion.type);
  const typeDisplayName = getTypeDisplayName(suggestion.type);

  return (
    <div className="w-80 max-w-sm rounded-lg shadow-xl border-2 p-4 bg-white backdrop-blur-sm hover-lift transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 animate-fade-in">
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full border border-white shadow-sm transition-transform duration-200 hover:scale-110"
            style={{ backgroundColor: colors.borderColor }}
          />
          <span className="font-medium text-sm text-gray-700 transition-colors duration-200">
            {typeDisplayName}
          </span>
        </div>
        <span className="text-xs text-gray-500 capitalize px-2 py-1 bg-gray-100 rounded-full transition-all duration-200 hover:bg-gray-200">
          {suggestion.priority} priority
        </span>
      </div>

      {/* Current text */}
      <div className="mb-3 animate-fade-in stagger-1">
        <div className="text-xs text-gray-600 mb-1 font-medium">Current text:</div>
        <div className="text-sm bg-gray-50 rounded-lg p-2 border border-gray-200 font-mono transition-all duration-200 hover:border-gray-300 hover:bg-gray-100">
          "{suggestion.textToReplace}"
        </div>
      </div>

      {/* Suggested replacement */}
      <div className="mb-3 animate-fade-in stagger-2">
        <div className="text-xs text-gray-600 mb-1 font-medium">Suggested change:</div>
        <div className="text-sm bg-gray-50 rounded-lg p-2 border border-gray-200 font-mono transition-all duration-200 hover:border-gray-300 hover:bg-gray-100">
          "<span style={{ color: colors.borderColor }} className="font-semibold">{suggestion.replaceWith}</span>"
        </div>
      </div>

      {/* Reason */}
      {suggestion.reason && (
        <div className="mb-2 animate-fade-in stagger-3">
          <div className="text-xs text-gray-600 mb-1 font-medium">Reason:</div>
          <div className="text-sm text-gray-700 transition-colors duration-200 hover:text-gray-900">
            {suggestion.reason}
          </div>
        </div>
      )}

      {/* Click hint */}
      <div className="text-xs text-gray-500 italic animate-fade-in stagger-4 flex items-center space-x-1">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <span>Click to expand in sidebar</span>
      </div>

      {/* Arrow pointing to highlight */}
      <div
        className="absolute w-3 h-3 transform rotate-45 bg-white border-l border-t border-gray-200"
        style={{
          top: '-6px',
          left: '24px'
        }}
      />
    </div>
  );
};
