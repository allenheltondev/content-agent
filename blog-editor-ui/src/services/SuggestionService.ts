import type { Suggestion, SuggestionType } from '../types';

/**
 * Configuration for suggestion processing
 */
export interface SuggestionProcessingConfig {
  maxContextLength: number;
  conflictResolutionStrategy: 'priority' | 'timestamp' | 'type';
  enableOffsetValidation: boolean;
  highlightPadding: number;
}

/**
 * Default configuration for suggestion processing
 */
const DEFAULT_CONFIG: SuggestionProcessingConfig = {
  maxContextLength: 100,
  conflictResolutionStrategy: 'priority',
  enableOffsetValidation: true,
  highlightPadding: 2
};

/**
 * Processed suggestion with additional metadata for UI rendering
 */
export interface ProcessedSuggestion extends Suggestion {
  isValid: boolean;
  actualText: string;
  highlightStart: number;
  highlightEnd: number;
  conflictsWith: string[];
  displayPriority: number;
}

/**
 * Suggestion conflict information
 */
export interface SuggestionConflict {
  suggestion1: string;
  suggestion2: string;
  overlapStart: number;
  overlapEnd: number;
  conflictType: 'overlap' | 'nested' | 'adjacent';
}

/**
 * Text highlighting calculation result
 */
export interface HighlightCalculation {
  suggestionId: string;
  startOffset: number;
  endOffset: number;
  text: string;
  type: SuggestionType;
  isVisible: boolean;
  zIndex: number;
}

/**
 * Service for processing and managing suggestion data
 */
export class SuggestionService {
  private config: SuggestionProcessingConfig;

  constructor(config: Partial<SuggestionProcessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process raw suggestions from API into UI-ready format
   */
  processSuggestions(suggestions: Suggestion[], content: string): ProcessedSuggestion[] {
    // First, validate all suggestions
    const validatedSuggestions = suggestions.map(suggestion =>
      this.validateSuggestion(suggestion, content)
    );

    // Detect conflicts between suggestions
    const conflicts = this.detectConflicts(validatedSuggestions);

    // Resolve conflicts and assign display priorities
    const resolvedSuggestions = this.resolveConflicts(validatedSuggestions, conflicts);

    // Calculate highlighting positions
    return resolvedSuggestions.map(suggestion =>
      this.calculateHighlighting(suggestion, content)
    );
  }

  /**
   * Validate a suggestion against the current content
   */
  private validateSuggestion(suggestion: Suggestion, content: string): ProcessedSuggestion {
    const { startOffset, endOffset, textToReplace, anchorText } = suggestion;

    // Basic offset validation
    const isOffsetValid = this.validateOffsets(startOffset, endOffset, content.length);

    // Extract actual text at the specified position
    const actualText = content.substring(startOffset, endOffset);

    // Check if the text matches what we expect
    const isTextMatch = this.validateTextMatch(actualText, textToReplace, anchorText);

    // Calculate highlight boundaries with padding
    const highlightStart = Math.max(0, startOffset - this.config.highlightPadding);
    const highlightEnd = Math.min(content.length, endOffset + this.config.highlightPadding);

    return {
      ...suggestion,
      isValid: isOffsetValid && isTextMatch,
      actualText,
      highlightStart,
      highlightEnd,
      conflictsWith: [],
      displayPriority: this.calculateBasePriority(suggestion)
    };
  }

  /**
   * Validate suggestion offsets
   */
  private validateOffsets(startOffset: number, endOffset: number, contentLength: number): boolean {
    if (!this.config.enableOffsetValidation) {
      return true;
    }

    return (
      startOffset >= 0 &&
      endOffset > startOffset &&
      endOffset <= contentLength &&
      (endOffset - startOffset) <= this.config.maxContextLength
    );
  }

  /**
   * Validate text matching between expected and actual content
   */
  private validateTextMatch(actualText: string, expectedText: string, anchorText: string): boolean {
    // Direct match
    if (actualText === expectedText) {
      return true;
    }

    // Fuzzy match - allow for minor whitespace differences
    const normalizedActual = actualText.replace(/\s+/g, ' ').trim();
    const normalizedExpected = expectedText.replace(/\s+/g, ' ').trim();

    if (normalizedActual === normalizedExpected) {
      return true;
    }

    // Anchor text fallback - check if actual text contains the anchor
    if (anchorText && actualText.includes(anchorText)) {
      return true;
    }

    // Partial match for longer texts (80% similarity threshold)
    if (expectedText.length > 20) {
      const similarity = this.calculateTextSimilarity(actualText, expectedText);
      return similarity >= 0.8;
    }

    return false;
  }

  /**
   * Calculate text similarity using simple character-based comparison
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
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
   * Calculate base priority for a suggestion
   */
  private calculateBasePriority(suggestion: Suggestion): number {
    const priorityWeights = { high: 100, medium: 50, low: 10 };
    const typeWeights = {
      spelling: 90,
      grammar: 80,
      fact: 70,
      brand: 60,
      llm: 50
    };

    return priorityWeights[suggestion.priority] + typeWeights[suggestion.type];
  }

  /**
   * Detect conflicts between suggestions
   */
  detectConflicts(suggestions: ProcessedSuggestion[]): SuggestionConflict[] {
    const conflicts: SuggestionConflict[] = [];

    for (let i = 0; i < suggestions.length; i++) {
      for (let j = i + 1; j < suggestions.length; j++) {
        const conflict = this.checkSuggestionConflict(suggestions[i], suggestions[j]);
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  /**
   * Check if two suggestions conflict with each other
   */
  private checkSuggestionConflict(
    suggestion1: ProcessedSuggestion,
    suggestion2: ProcessedSuggestion
  ): SuggestionConflict | null {
    const s1Start = suggestion1.startOffset;
    const s1End = suggestion1.endOffset;
    const s2Start = suggestion2.startOffset;
    const s2End = suggestion2.endOffset;

    // No overlap
    if (s1End <= s2Start || s2End <= s1Start) {
      return null;
    }

    // Calculate overlap
    const overlapStart = Math.max(s1Start, s2Start);
    const overlapEnd = Math.min(s1End, s2End);

    // Determine conflict type
    let conflictType: 'overlap' | 'nested' | 'adjacent';

    if (s1Start === s2Start && s1End === s2End) {
      conflictType = 'overlap'; // Exact same range
    } else if ((s1Start <= s2Start && s1End >= s2End) || (s2Start <= s1Start && s2End >= s1End)) {
      conflictType = 'nested'; // One contains the other
    } else {
      conflictType = 'overlap'; // Partial overlap
    }

    return {
      suggestion1: suggestion1.id,
      suggestion2: suggestion2.id,
      overlapStart,
      overlapEnd,
      conflictType
    };
  }

  /**
   * Resolve conflicts between suggestions
   */
  private resolveConflicts(
    suggestions: ProcessedSuggestion[],
    conflicts: SuggestionConflict[]
  ): ProcessedSuggestion[] {
    // Build conflict map
    const conflictMap = new Map<string, string[]>();

    conflicts.forEach(conflict => {
      const { suggestion1, suggestion2 } = conflict;

      if (!conflictMap.has(suggestion1)) {
        conflictMap.set(suggestion1, []);
      }
      if (!conflictMap.has(suggestion2)) {
        conflictMap.set(suggestion2, []);
      }

      conflictMap.get(suggestion1)!.push(suggestion2);
      conflictMap.get(suggestion2)!.push(suggestion1);
    });

    // Update suggestions with conflict information
    return suggestions.map(suggestion => {
      const conflictsWith = conflictMap.get(suggestion.id) || [];

      // Adjust display priority based on conflicts
      let adjustedPriority = suggestion.displayPriority;

      if (conflictsWith.length > 0) {
        // Apply conflict resolution strategy
        switch (this.config.conflictResolutionStrategy) {
          case 'priority':
            // Higher priority suggestions get boost
            adjustedPriority += suggestion.displayPriority * 0.1;
            break;
          case 'timestamp':
            // Newer suggestions get boost
            adjustedPriority += (Date.now() - suggestion.createdAt) / 1000000;
            break;
          case 'type':
            // Certain types get priority (spelling > grammar > others)
            const typeBoost = { spelling: 20, grammar: 15, fact: 10, brand: 5, llm: 0 };
            adjustedPriority += typeBoost[suggestion.type];
            break;
        }
      }

      return {
        ...suggestion,
        conflictsWith,
        displayPriority: adjustedPriority
      };
    });
  }

  /**
   * Calculate highlighting positions for UI rendering
   */
  private calculateHighlighting(suggestion: ProcessedSuggestion, _content: string): ProcessedSuggestion {
    // For now, use the original offsets
    // In a more complex implementation, this could adjust for text reflow, etc.
    return suggestion;
  }

  /**
   * Calculate highlight positions for all suggestions
   */
  calculateHighlights(suggestions: ProcessedSuggestion[]): HighlightCalculation[] {
    return suggestions
      .filter(s => s.isValid)
      .sort((a, b) => b.displayPriority - a.displayPriority)
      .map((suggestion, index) => ({
        suggestionId: suggestion.id,
        startOffset: suggestion.startOffset,
        endOffset: suggestion.endOffset,
        text: suggestion.actualText,
        type: suggestion.type,
        isVisible: suggestion.conflictsWith.length === 0 || index === 0,
        zIndex: 1000 - index // Higher priority suggestions appear on top
      }));
  }

  /**
   * Apply a suggestion to content and return updated text
   */
  applySuggestion(content: string, suggestion: Suggestion): string {
    const { startOffset, endOffset, replaceWith } = suggestion;

    // Validate offsets before applying
    if (startOffset < 0 || endOffset > content.length || startOffset >= endOffset) {
      throw new Error('Invalid suggestion offsets');
    }

    return (
      content.substring(0, startOffset) +
      replaceWith +
      content.substring(endOffset)
    );
  }

  /**
   * Remove a suggestion from a list and update conflicts
   */
  removeSuggestion(suggestions: ProcessedSuggestion[], suggestionId: string): ProcessedSuggestion[] {
    const filtered = suggestions.filter(s => s.id !== suggestionId);

    // Update conflict information for remaining suggestions
    return filtered.map(suggestion => ({
      ...suggestion,
      conflictsWith: suggestion.conflictsWith.filter(id => id !== suggestionId)
    }));
  }

  /**
   * Get suggestions by type
   */
  getSuggestionsByType(suggestions: ProcessedSuggestion[], type: SuggestionType): ProcessedSuggestion[] {
    return suggestions.filter(s => s.type === type && s.isValid);
  }

  /**
   * Get conflicting suggestions for a given suggestion
   */
  getConflictingSuggestions(
    suggestions: ProcessedSuggestion[],
    suggestionId: string
  ): ProcessedSuggestion[] {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return [];

    return suggestions.filter(s => suggestion.conflictsWith.includes(s.id));
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SuggestionProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): SuggestionProcessingConfig {
    return { ...this.config };
  }
}

/**
 * Create a configured SuggestionService instance
 */
export function createSuggestionService(config?: Partial<SuggestionProcessingConfig>): SuggestionService {
  return new SuggestionService(config);
}

/**
 * Default suggestion service instance
 */
export const suggestionService = createSuggestionService();
