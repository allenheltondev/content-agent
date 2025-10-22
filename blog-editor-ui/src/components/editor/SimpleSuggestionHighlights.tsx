import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { Suggestion, SuggestionType } from '../../types';

interface SimpleSuggestionHighlightsProps {
  suggestions: Suggestion[];
  activeSuggestionId: string | null;
  content: string;
  onHighlightClick: (suggestionId: string) => void;
  onAccept?: (suggestionId: string) => void;
  onReject?: (suggestionId: string) => void;
  className?: string;
}



/**
 * Get suggestion type color for highlighting
 */
const getSuggestionTypeColor = (type: SuggestionType, isActive: boolean) => {
  const colors = {
    llm: isActive ? 'bg-blue-200 border-blue-400' : 'bg-blue-100 border-blue-300',
    brand: isActive ? 'bg-purple-200 border-purple-400' : 'bg-purple-100 border-purple-300',
    fact: isActive ? 'bg-orange-200 border-orange-400' : 'bg-orange-100 border-orange-300',
    grammar: isActive ? 'bg-green-200 border-green-400' : 'bg-green-100 border-green-300',
    spelling: isActive ? 'bg-red-200 border-red-400' : 'bg-red-100 border-red-300'
  };
  return colors[type] || colors.llm;
};




export const SimpleSuggestionHighlights: React.FC<SimpleSuggestionHighlightsProps> = ({
  suggestions,
  activeSuggestionId,
  content,
  onHighlightClick,
  onAccept: _onAccept,
  onReject: _onReject,
  className = ''
}) => {
  const [_popoverPosition, _setPopoverPosition] = useState({ top: 0, left: 0 });
  const activeHighlightRef = useRef<HTMLSpanElement>(null);

  // Find the active suggestion
  const activeSuggestion = useMemo(() => {
    return suggestions.find(s => s.id === activeSuggestionId) || null;
  }, [suggestions, activeSuggestionId]);
  // Create text segments for rendering
  const textSegments = useMemo(() => {
    if (!suggestions.length || !content) {
      return [{ text: content, type: 'text' as const }];
    }

    const segments: Array<{
      text: string;
      type: 'text' | 'highlight';
      suggestion?: Suggestion;
    }> = [];

    let currentOffset = 0;

    // Sort suggestions by start offset
    const sortedSuggestions = [...suggestions].sort((a, b) => a.startOffset - b.startOffset);

    for (const suggestion of sortedSuggestions) {
      const { startOffset, endOffset } = suggestion;

      // Skip overlapping suggestions
      if (startOffset < currentOffset) continue;

      // Add text before the highlight
      if (startOffset > currentOffset) {
        const textBefore = content.substring(currentOffset, startOffset);
        if (textBefore) {
          segments.push({
            text: textBefore,
            type: 'text'
          });
        }
      }

      // Add the highlight
      const highlightText = content.substring(startOffset, endOffset);
      segments.push({
        text: highlightText,
        type: 'highlight',
        suggestion
      });

      currentOffset = endOffset;
    }

    // Add remaining text after the last highlight
    if (currentOffset < content.length) {
      const remainingText = content.substring(currentOffset);
      segments.push({
        text: remainingText,
        type: 'text'
      });
    }

    return segments;
  }, [suggestions, content]);

  // Auto-scroll to active suggestion and calculate popover position
  useEffect(() => {
    if (activeSuggestion && activeHighlightRef.current) {
      const highlightElement = activeHighlightRef.current;
      const highlightRect = highlightElement.getBoundingClientRect();

      // Auto-scroll to the active suggestion with smooth behavior
      // Small delay to ensure the element is rendered
      setTimeout(() => {
        highlightElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center', // Center the suggestion in the viewport
          inline: 'nearest'
        });
      }, 50);

      // Add a brief pulse animation to draw attention
      highlightElement.style.animation = 'none';
      setTimeout(() => {
        highlightElement.style.animation = 'pulse 2s ease-in-out';
      }, 200);

      const popoverHeight = 300; // Estimated popover height
      const popoverWidth = 320; // Estimated popover width

      // Calculate position relative to viewport
      let top = highlightRect.bottom + 8;
      let left = highlightRect.left;

      // Adjust if popover would go off-screen
      if (top + popoverHeight > window.innerHeight) {
        top = highlightRect.top - popoverHeight - 8;
      }

      if (left + popoverWidth > window.innerWidth) {
        left = window.innerWidth - popoverWidth - 16;
      }

      if (left < 16) {
        left = 16;
      }

      _setPopoverPosition({ top, left });
    }
  }, [activeSuggestion, activeSuggestionId]);

  return (
    <div className={`simple-suggestion-highlights ${className}`}>

      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {textSegments.map((segment, index) => {
          if (segment.type === 'highlight' && segment.suggestion) {
            const { suggestion } = segment;
            const isActive = suggestion.id === activeSuggestionId;
            const colorClasses = getSuggestionTypeColor(suggestion.type, isActive);

            return (
              <span
                key={`${suggestion.id}-${index}`}
                ref={isActive ? activeHighlightRef : undefined}
                className={`
                  suggestion-highlight relative inline cursor-pointer border-b-2 border-dashed
                  ${colorClasses}
                  ${isActive
                    ? 'shadow-lg ring-2 ring-blue-400 ring-opacity-50 scale-105 font-semibold'
                    : 'hover:shadow-sm'
                  }
                  transition-all duration-300 ease-in-out
                `}
                style={{
                  ...(isActive && {
                    transform: 'scale(1.02)',
                    zIndex: 10,
                    position: 'relative'
                  })
                }}
                onClick={() => onHighlightClick(suggestion.id)}
                title={`${suggestion.type}: ${suggestion.reason}`}
                data-suggestion-id={suggestion.id}
                data-suggestion-type={suggestion.type}
              >
                {segment.text}
                {isActive && (
                  <>
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded-md shadow-lg whitespace-nowrap z-20">
                      Suggestion {suggestions.findIndex(s => s.id === suggestion.id) + 1} of {suggestions.length}
                    </span>
                  </>
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
