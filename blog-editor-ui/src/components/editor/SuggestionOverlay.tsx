import { useMemo } from 'react';
import { SuggestionHighlight } from './SuggestionHighlight';
import { suggestionService } from '../../services/SuggestionService';
import type { Suggestion } from '../../types';

interface SuggestionOverlayProps {
  suggestions: Suggestion[];
  content: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  className?: string;
}

/**
 * Text segment for rendering with highlights
 */
interface TextSegment {
  text: string;
  type: 'text' | 'highlight';
  suggestion?: Suggestion;
  startOffset: number;
  endOffset: number;
}

/**
 * SuggestionOverlay component manages multiple suggestion highlights
 * and renders them as overlays on the text content
 */
export const SuggestionOverlay = ({
  suggestions,
  content,
  onAccept,
  onReject,
  className = ''
}: SuggestionOverlayProps) => {
  // Process suggestions and calculate highlights
  const processedData = useMemo(() => {
    if (!suggestions.length || !content) {
      return {
        processedSuggestions: [],
        highlights: [],
        textSegments: [{ text: content, type: 'text' as const, startOffset: 0, endOffset: content.length }]
      };
    }

    // Process suggestions through the service
    const processedSuggestions = suggestionService.processSuggestions(suggestions, content);

    // Get highlight calculations
    const highlights = suggestionService.calculateHighlights(processedSuggestions);

    // Create text segments for rendering
    const textSegments = createTextSegments(content, processedSuggestions.filter(s => s.isValid));

    return {
      processedSuggestions,
      highlights,
      textSegments
    };
  }, [suggestions, content]);

  const { textSegments } = processedData;

  return (
    <div className={`relative ${className}`}>
      {/* Render text with highlights */}
      <div className="whitespace-pre-wrap break-words leading-relaxed">
        {textSegments.map((segment, index) => {
          if (segment.type === 'highlight' && segment.suggestion) {
            return (
              <SuggestionHighlight
                key={`${segment.suggestion.id}-${index}`}
                suggestion={segment.suggestion}
                content={content}
                onAccept={onAccept}
                onReject={onReject}
                isVisible={true}
                zIndex={1000 - index}
              />
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

/**
 * Create text segments from content and suggestions for rendering
 */
function createTextSegments(content: string, suggestions: Suggestion[]): TextSegment[] {
  if (!suggestions.length) {
    return [{
      text: content,
      type: 'text',
      startOffset: 0,
      endOffset: content.length
    }];
  }

  // Sort suggestions by start offset
  const sortedSuggestions = [...suggestions].sort((a, b) => a.startOffset - b.startOffset);

  const segments: TextSegment[] = [];
  let currentOffset = 0;

  for (const suggestion of sortedSuggestions) {
    const { startOffset, endOffset } = suggestion;

    // Skip invalid suggestions
    if (startOffset < 0 || endOffset > content.length || startOffset >= endOffset) {
      continue;
    }

    // Skip overlapping suggestions (keep the first one)
    if (startOffset < currentOffset) {
      continue;
    }

    // Add text before the suggestion
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

    // Add the suggestion highlight
    const suggestionText = content.substring(startOffset, endOffset);
    segments.push({
      text: suggestionText,
      type: 'highlight',
      suggestion,
      startOffset,
      endOffset
    });

    currentOffset = endOffset;
  }

  // Add remaining text after the last suggestion
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
}

/**
 * Hook to get suggestion statistics
 */
export function useSuggestionStats(suggestions: Suggestion[]) {
  return useMemo(() => {
    const stats = {
      total: suggestions.length,
      byType: {
        llm: 0,
        brand: 0,
        fact: 0,
        grammar: 0,
        spelling: 0
      },
      byPriority: {
        high: 0,
        medium: 0,
        low: 0
      }
    };

    suggestions.forEach(suggestion => {
      stats.byType[suggestion.type]++;
      stats.byPriority[suggestion.priority]++;
    });

    return stats;
  }, [suggestions]);
}
