import type { Suggestion, SuggestionType } from '../types';
import type { ProcessedSuggestion } from '../services/SuggestionService';

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

/**
 * Get color classes for a suggestion type
 */
export function getSuggestionColors(type: SuggestionType) {
  return SUGGESTION_COLORS[type];
}

/**
 * Get display name for suggestion type
 */
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
 * Calculate text similarity between two strings
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const maxLength = Math.max(text1.length, text2.length);
  if (maxLength === 0) return 1;

  let matches = 0;
  const minLength = Math.min(text1.length, text2.length);

  for (let i = 0; i < minLength; i++) {
    if (text1[i] === text2[i]) {
      matches++;
    }
  }

  return matches / maxLength;
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

/**
 * Group suggestions by type
 */
export function groupSuggestionsByType(
  suggestions: ProcessedSuggestion[]
): Record<SuggestionType, ProcessedSuggestion[]> {
  const groups: Record<SuggestionType, ProcessedSuggestion[]> = {
    llm: [],
    brand: [],
    fact: [],
    grammar: [],
    spelling: []
  };

  suggestions.forEach(suggestion => {
    groups[suggestion.type].push(suggestion);
  });

  return groups;
}

/**
 * Sort suggestions by display priority
 */
export function sortSuggestionsByPriority(
  suggestions: ProcessedSuggestion[]
): ProcessedSuggestion[] {
  return [...suggestions].sort((a, b) => b.displayPriority - a.displayPriority);
}

/**
 * Find suggestions that would be affected by applying another suggestion
 */
export function findAffectedSuggestions(
  targetSuggestion: Suggestion,
  allSuggestions: Suggestion[]
): Suggestion[] {
  const { endOffset } = targetSuggestion;

  return allSuggestions.filter(suggestion => {
    if (suggestion.id === targetSuggestion.id) {
      return false;
    }

    // Check if this suggestion comes after the target and would be affected by offset changes
    return suggestion.startOffset >= endOffset;
  });
}

/**
 * Calculate offset adjustments after applying a suggestion
 */
export function calculateOffsetAdjustments(
  appliedSuggestion: Suggestion,
  affectedSuggestions: Suggestion[]
): Suggestion[] {
  const { startOffset, endOffset, replaceWith } = appliedSuggestion;
  const lengthDifference = replaceWith.length - (endOffset - startOffset);

  return affectedSuggestions.map(suggestion => ({
    ...suggestion,
    startOffset: suggestion.startOffset + lengthDifference,
    endOffset: suggestion.endOffset + lengthDifference
  }));
}

/**
 * Check if a suggestion can be safely applied
 */
export function canApplySuggestionSafely(
  suggestion: Suggestion,
  content: string,
  otherSuggestions: Suggestion[]
): boolean {
  // Validate basic offsets
  if (!validateSuggestionOffsets(suggestion, content)) {
    return false;
  }

  // Check for conflicts with other suggestions
  const hasConflicts = otherSuggestions.some(other => {
    if (other.id === suggestion.id) return false;

    // Check for overlapping ranges
    return !(
      suggestion.endOffset <= other.startOffset ||
      other.endOffset <= suggestion.startOffset
    );
  });

  return !hasConflicts;
}

/**
 * Get CSS classes for suggestion highlighting
 */
export function getSuggestionHighlightClasses(
  type: SuggestionType,
  isHovered: boolean = false
): string {
  const colors = getSuggestionColors(type);
  const baseClasses = `${colors.background} ${colors.border} ${colors.text}`;
  const hoverClasses = isHovered ? colors.hover : '';

  return `${baseClasses} ${hoverClasses}`.trim();
}

/**
 * Format suggestion reason for display
 */
export function formatSuggestionReason(reason: string): string {
  // Capitalize first letter and ensure proper punctuation
  const formatted = reason.charAt(0).toUpperCase() + reason.slice(1);
  return formatted.endsWith('.') ? formatted : `${formatted}.`;
}

/**
 * Get suggestion priority weight for sorting
 */
export function getSuggestionPriorityWeight(priority: 'low' | 'medium' | 'high'): number {
  const weights = {
    high: 100,
    medium: 50,
    low: 10
  };

  return weights[priority];
}

/**
 * Get suggestion type weight for sorting
 */
export function getSuggestionTypeWeight(type: SuggestionType): number {
  const weights = {
    spelling: 90,
    grammar: 80,
    fact: 70,
    brand: 60,
    llm: 50
  };

  return weights[type];
}

/**
 * Calculate combined suggestion score for prioritization
 */
export function calculateSuggestionScore(suggestion: Suggestion): number {
  const priorityWeight = getSuggestionPriorityWeight(suggestion.priority);
  const typeWeight = getSuggestionTypeWeight(suggestion.type);
  const timeWeight = (Date.now() - suggestion.createdAt) / 1000000; // Newer suggestions get slight boost

  return priorityWeight + typeWeight - timeWeight;
}
