import type { Suggestion, SuggestionType } from '../types';
// Removed unused type import for hackathon build simplicity

/**
 * Color scheme for different suggestion types
 */
export const SUGGESTION_COLORS = {
  llm: {
    background: 'bg-blue-200',
    border: 'border-blue-400',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-300'
  },
  brand: {
    background: 'bg-purple-200',
    border: 'border-purple-400',
    text: 'text-purple-800',
    hover: 'hover:bg-purple-300'
  },
  fact: {
    background: 'bg-orange-200',
    border: 'border-orange-400',
    text: 'text-orange-800',
    hover: 'hover:bg-orange-300'
  },
  grammar: {
    background: 'bg-green-200',
    border: 'border-green-400',
    text: 'text-green-800',
    hover: 'hover:bg-green-300'
  },
  spelling: {
    background: 'bg-red-200',
    border: 'border-red-400',
    text: 'text-red-800',
    hover: 'hover:bg-red-300'
  }
} as const;

/**
 * Position information for suggestion highlighting
 */
export interface HighlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Text segment for rendering with highlights
 */
export interface TextSegment {
  text: string;
  type: 'text' | 'highlight';
  suggestion?: Suggestion;
  startOffset: number;
  endOffset: number;
}

export function getSuggestionColors(type: SuggestionType) {
  return SUGGESTION_COLORS[type];
}

export function getSuggestionTypeDisplayName(type: SuggestionType): string {
  const displayNames = {
    llm: 'Writing Enhancement',
    brand: 'Brand Guidelines',
    fact: 'Fact Check',
    grammar: 'Grammar',
    spelling: 'Spelling'
  };

  return displayNames[type];
}



/**
 * Validate suggestion offsets against content
 */
export function validateSuggestionOffsets(
  suggestion: Suggestion,
  content: string
): boolean {
  const { startOffset, endOffset } = suggestion;

  return (
    startOffset >= 0 &&
    endOffset > startOffset &&
    endOffset <= content.length
  );
}

/**
 * Extract text at suggestion position
 */
export function extractSuggestionText(
  suggestion: Suggestion,
  content: string
): string {
  const { startOffset, endOffset } = suggestion;

  if (!validateSuggestionOffsets(suggestion, content)) {
    return suggestion.textToReplace;
  }

  return content.substring(startOffset, endOffset);
}

/**
 * Apply a suggestion to content
 */
export function applySuggestionToContent(
  content: string,
  suggestion: Suggestion
): string {
  const { startOffset, endOffset, replaceWith } = suggestion;

  if (!validateSuggestionOffsets(suggestion, content)) {
    throw new Error('Invalid suggestion offsets');
  }

  return (
    content.substring(0, startOffset) +
    replaceWith +
    content.substring(endOffset)
  );
}



export function getSuggestionHighlightClasses(
  type: SuggestionType,
  isHovered: boolean = false
): string {
  const colors = getSuggestionColors(type);
  const baseClasses = `${colors.background} ${colors.border} ${colors.text}`;
  const hoverClasses = isHovered ? colors.hover : '';

  return `${baseClasses} ${hoverClasses}`.trim();
}


