import type { Suggestion, ContentDiff } from '../types';
import { apiService } from './ApiService';
import { suggestionPositionCache } from '../utils/suggestionCache';

/**
 * Range of content that has been modified
 */
export interface ContentRange {
  startOffset: number;
  endOffset: number;
}

/**
 * Delta information for updating suggestion positions
 */
export interface SuggestionDelta {
  suggestionId: string;
  oldStartOffset: number;
  oldEndOffset: number;
  newStartOffset: number;
  newEndOffset: number;
  isValid: boolean;
  requiresUpdate: boolean;
}

/**
 * Result of suggestion recalculation process
 */
export interface RecalculationResult {
  updatedSuggestions: Suggestion[];
  invalidatedSuggestions: string[];
  newSuggestions: Suggestion[];
  changedRanges: ContentRange[];
}

/**
 * Configuration for suggestion recalculation
 */
export interface RecalculationConfig {
  enablePositionUpdates: boolean;
  enableInvalidation: boolean;
  enableNewSuggestionRequests: boolean;
  minChangedRangeLength: number;
  maxChangedRangeLength: number;
}

/**
 * Default configuration for suggestion recalculation
 */
const DEFAULT_CONFIG: RecalculationConfig = {
  enablePositionUpdates: true,
  enableInvalidation: true,
  enableNewSuggestionRequests: true,
  minChangedRangeLength: 5, // Minimum 5 characters to request new suggestions
  maxChangedRangeLength: 1000 // Maximum 1000 characters per request
};

/**
 * Service for recalculating suggestion positions after content changes
 */
export class SuggestionRecalculationService {
  private config: RecalculationConfig;

  constructor(config: Partial<RecalculationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Track content changes between two versions of content
   */
  trackContentChange(oldContent: string, newContent: string): ContentDiff {
    // Simple diff algorithm - find the first and last differing positions
    let startOffset = 0;
    let endOffset = oldContent.length;

    // Find first difference
    while (startOffset < Math.min(oldContent.length, newContent.length) &&
           oldContent[startOffset] === newContent[startOffset]) {
      startOffset++;
    }

    // If no differences found, content is identical
    if (startOffset === oldContent.length && startOffset === newContent.length) {
      return {
        type: 'replace',
        startOffset: 0,
        endOffset: 0,
        oldText: '',
        newText: '',
        timestamp: Date.now()
      };
    }

    // Find last difference by working backwards
    let oldEndIndex = oldContent.length - 1;
    let newEndIndex = newContent.length - 1;

    while (oldEndIndex >= startOffset && newEndIndex >= startOffset &&
           oldContent[oldEndIndex] === newContent[newEndIndex]) {
      oldEndIndex--;
      newEndIndex--;
    }

    endOffset = oldEndIndex + 1;
    const newEndOffset = newEndIndex + 1;

    const oldText = oldContent.substring(startOffset, endOffset);
    const newText = newContent.substring(startOffset, newEndOffset);

    // Determine change type
    let type: ContentDiff['type'];
    if (oldText === '' && newText !== '') {
      type = 'insert';
    } else if (oldText !== '' && newText === '') {
      type = 'delete';
    } else {
      type = 'replace';
    }

    return {
      type,
      startOffset,
      endOffset,
      oldText,
      newText,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate position deltas for suggestions based on content diffs
   * Uses caching to improve performance for repeated calculations
   */
  calculatePositionDeltas(diffs: ContentDiff[], suggestions: Suggestion[]): SuggestionDelta[] {
    if (!this.config.enablePositionUpdates) {
      return [];
    }

    // Try to get from cache first
    const cachedDeltas = suggestionPositionCache.get('', suggestions, diffs);
    if (cachedDeltas) {
      return cachedDeltas;
    }

    const deltas: SuggestionDelta[] = [];

    // Optimize for large suggestion sets by pre-sorting diffs
    const sortedDiffs = [...diffs].sort((a, b) => a.timestamp - b.timestamp);

    // Pre-calculate cumulative deltas for better performance
    const cumulativeDeltas = this.calculateCumulativeDeltas(sortedDiffs);

    for (const suggestion of suggestions) {
      const delta = this.calculateSuggestionDelta(suggestion, sortedDiffs, cumulativeDeltas);
      deltas.push(delta);
    }

    // Cache the result
    suggestionPositionCache.set('', suggestions, diffs, deltas);

    return deltas;
  }

  /**
   * Calculate cumulative position deltas for efficient suggestion updates
   */
  private calculateCumulativeDeltas(sortedDiffs: ContentDiff[]): Array<{ offset: number; delta: number }> {
    const cumulativeDeltas: Array<{ offset: number; delta: number }> = [];
    let cumulativeDelta = 0;

    for (const diff of sortedDiffs) {
      const delta = diff.newText.length - diff.oldText.length;
      cumulativeDelta += delta;

      cumulativeDeltas.push({
        offset: diff.endOffset,
        delta: cumulativeDelta
      });
    }

    return cumulativeDeltas;
  }

  /**
   * Calculate delta for a single suggestion using optimized algorithm
   */
  private calculateSuggestionDelta(
    suggestion: Suggestion,
    sortedDiffs: ContentDiff[],
    cumulativeDeltas: Array<{ offset: number; delta: number }>
  ): SuggestionDelta {
    let newStartOffset = suggestion.startOffset;
    let newEndOffset = suggestion.endOffset;
    let isValid = true;
    let requiresUpdate = false;

    // Check for overlaps first (most common case for invalidation)
    for (const diff of sortedDiffs) {
      const suggestionOverlaps = !(suggestion.endOffset <= diff.startOffset ||
                                  suggestion.startOffset >= diff.endOffset);

      if (suggestionOverlaps) {
        isValid = false;
        break;
      }
    }

    // If valid, calculate position updates using cumulative deltas
    if (isValid) {
      // Find the cumulative delta that applies to this suggestion
      let applicableDelta = 0;

      for (const { offset, delta } of cumulativeDeltas) {
        if (suggestion.startOffset >= offset) {
          applicableDelta = delta;
          requiresUpdate = true;
        } else {
          break;
        }
      }

      if (requiresUpdate) {
        newStartOffset += applicableDelta;
        newEndOffset += applicableDelta;
      }
    }

    return {
      suggestionId: suggestion.id,
      oldStartOffset: suggestion.startOffset,
      oldEndOffset: suggestion.endOffset,
      newStartOffset,
      newEndOffset,
      isValid,
      requiresUpdate
    };
  }

  /**
   * Update suggestion positions using calculated deltas
   */
  recalculateSuggestionPositions(suggestions: Suggestion[], deltas: SuggestionDelta[]): Suggestion[] {
    if (!this.config.enablePositionUpdates) {
      return suggestions;
    }

    const deltaMap = new Map(deltas.map(d => [d.suggestionId, d]));
    const updatedSuggestions: Suggestion[] = [];

    for (const suggestion of suggestions) {
      const delta = deltaMap.get(suggestion.id);

      if (!delta || !delta.isValid) {
        // Skip invalid suggestions - they will be handled by invalidation
        continue;
      }

      if (delta.requiresUpdate) {
        // Update suggestion with new positions
        updatedSuggestions.push({
          ...suggestion,
          startOffset: delta.newStartOffset,
          endOffset: delta.newEndOffset
        });
      } else {
        // Keep suggestion as-is
        updatedSuggestions.push(suggestion);
      }
    }

    return updatedSuggestions;
  }

  /**
   * Invalidate suggestions that overlap with changed content
   */
  invalidateOverlappingSuggestions(suggestions: Suggestion[], changedRanges: ContentRange[]): Suggestion[] {
    if (!this.config.enableInvalidation) {
      return suggestions;
    }

    return suggestions.filter(suggestion => {
      // Check if suggestion overlaps with any changed range
      for (const range of changedRanges) {
        const overlaps = !(suggestion.endOffset <= range.startOffset ||
                          suggestion.startOffset >= range.endOffset);
        if (overlaps) {
          return false; // Remove overlapping suggestion
        }
      }
      return true; // Keep non-overlapping suggestion
    });
  }

  /**
   * Extract changed ranges from content diffs
   */
  private extractChangedRanges(diffs: ContentDiff[]): ContentRange[] {
    const ranges: ContentRange[] = [];

    for (const diff of diffs) {
      // For inserts, the range is the insertion point
      // For deletes and replaces, the range is the original text location
      const range: ContentRange = {
        startOffset: diff.startOffset,
        endOffset: diff.type === 'insert' ? diff.startOffset : diff.endOffset
      };

      // Only include ranges that meet minimum length requirements
      const rangeLength = range.endOffset - range.startOffset;
      if (rangeLength >= this.config.minChangedRangeLength) {
        ranges.push(range);
      }
    }

    // Merge overlapping ranges
    return this.mergeOverlappingRanges(ranges);
  }

  /**
   * Merge overlapping content ranges
   */
  private mergeOverlappingRanges(ranges: ContentRange[]): ContentRange[] {
    if (ranges.length <= 1) {
      return ranges;
    }

    // Sort ranges by start offset
    const sorted = [...ranges].sort((a, b) => a.startOffset - b.startOffset);
    const merged: ContentRange[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      // Check if ranges overlap or are adjacent
      if (current.startOffset <= last.endOffset) {
        // Merge ranges
        last.endOffset = Math.max(last.endOffset, current.endOffset);
      } else {
        // Add as separate range
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Request new suggestions for changed content areas
   */
  async requestNewSuggestions(postId: string, changedContent: string): Promise<Suggestion[]> {
    if (!this.config.enableNewSuggestionRequests) {
      return [];
    }

    // Don't request suggestions for very small or very large changes
    if (changedContent.length < this.config.minChangedRangeLength ||
        changedContent.length > this.config.maxChangedRangeLength) {
      return [];
    }

    try {
      // Use the existing start-review API to trigger suggestion generation
      // This will start the full analysis process which includes generating new suggestions
      const response = await apiService.startReview(postId);

      // The start-review API returns a token for subscribing to results
      // In a real implementation, we would need to wait for the analysis to complete
      // and then fetch the new suggestions. For now, we'll return empty array
      // as the suggestions will be available when the user next loads them.

      console.log('Started review process for new suggestions:', response);
      return [];
    } catch (error) {
      console.error('Failed to request new suggestions:', error);
      return [];
    }
  }

  /**
   * Merge new suggestions with existing ones, avoiding duplicates
   */
  mergeSuggestionSets(existing: Suggestion[], newSuggestions: Suggestion[]): Suggestion[] {
    const existingIds = new Set(existing.map(s => s.id));
    const uniqueNewSuggestions = newSuggestions.filter(s => !existingIds.has(s.id));

    return [...existing, ...uniqueNewSuggestions];
  }

  /**
   * Perform complete suggestion recalculation after content changes
   */
  async performRecalculation(
    oldContent: string,
    newContent: string,
    currentSuggestions: Suggestion[],
    postId: string
  ): Promise<RecalculationResult> {
    // Track content changes
    const contentDiff = this.trackContentChange(oldContent, newContent);
    const diffs = [contentDiff];

    // Extract changed ranges
    const changedRanges = this.extractChangedRanges(diffs);

    // Calculate position deltas
    const deltas = this.calculatePositionDeltas(diffs, currentSuggestions);

    // Update suggestion positions
    const updatedSuggestions = this.recalculateSuggestionPositions(currentSuggestions, deltas);

    // Invalidate overlapping suggestions
    const validSuggestions = this.invalidateOverlappingSuggestions(updatedSuggestions, changedRanges);

    // Get IDs of invalidated suggestions
    const validIds = new Set(validSuggestions.map(s => s.id));
    const invalidatedSuggestions = currentSuggestions
      .filter(s => !validIds.has(s.id))
      .map(s => s.id);

    // Request new suggestions for changed areas
    let newSuggestions: Suggestion[] = [];
    if (changedRanges.length > 0 && contentDiff.newText.trim()) {
      try {
        newSuggestions = await this.requestNewSuggestions(postId, contentDiff.newText);
      } catch (error) {
        console.error('Failed to get new suggestions:', error);
        // Continue without new suggestions
      }
    }

    return {
      updatedSuggestions: validSuggestions,
      invalidatedSuggestions,
      newSuggestions,
      changedRanges
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RecalculationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): RecalculationConfig {
    return { ...this.config };
  }
}

/**
 * Create a configured SuggestionRecalculationService instance
 */
export function createSuggestionRecalculationService(
  config?: Partial<RecalculationConfig>
): SuggestionRecalculationService {
  return new SuggestionRecalculationService(config);
}

/**
 * Default suggestion recalculation service instance
 */
export const suggestionRecalculationService = createSuggestionRecalculationService();
