/**
 * Example usage of SuggestionRecalculationService
 * This file demonstrates how to integrate the service with the existing editor system
 */

import { suggestionRecalculationService } from './SuggestionRecalculationService';
import { apiService } from './ApiService';
import type { Suggestion } from '../types';

/**
 * Example: Recalculate suggestions after content editing
 */
export async function handleContentChangeExample(
  postId: string,
  oldContent: string,
  newContent: string,
  currentSuggestions: Suggestion[]
): Promise<{
  updatedSuggestions: Suggestion[];
  invalidatedCount: number;
  newSuggestionsRequested: boolean;
}> {
  try {
    // Perform complete recalculation
    const result = await suggestionRecalculationService.performRecalculation(
      oldContent,
      newContent,
      currentSuggestions,
      postId
    );

    console.log('Recalculation complete:', {
      updatedSuggestions: result.updatedSuggestions.length,
      invalidatedSuggestions: result.invalidatedSuggestions.length,
      newSuggestions: result.newSuggestions.length,
      changedRanges: result.changedRanges.length
    });

    return {
      updatedSuggestions: result.updatedSuggestions,
      invalidatedCount: result.invalidatedSuggestions.length,
      newSuggestionsRequested: result.changedRanges.length > 0
    };
  } catch (error) {
    console.error('Failed to recalculate suggestions:', error);

    // Fallback: return original suggestions
    return {
      updatedSuggestions: currentSuggestions,
      invalidatedCount: 0,
      newSuggestionsRequested: false
    };
  }
}

/**
 * Example: Manual content diff tracking
 */
export function trackContentChangesExample(oldContent: string, newContent: string) {
  const diff = suggestionRecalculationService.trackContentChange(oldContent, newContent);

  console.log('Content change detected:', {
    type: diff.type,
    startOffset: diff.startOffset,
    endOffset: diff.endOffset,
    oldText: diff.oldText,
    newText: diff.newText,
    timestamp: new Date(diff.timestamp).toISOString()
  });

  return diff;
}

/**
 * Example: Position delta calculation
 */
export function calculatePositionDeltasExample(
  oldContent: string,
  newContent: string,
  suggestions: Suggestion[]
) {
  // Track the content change
  const diff = suggestionRecalculationService.trackContentChange(oldContent, newContent);

  // Calculate how this affects suggestion positions
  const deltas = suggestionRecalculationService.calculatePositionDeltas([diff], suggestions);

  console.log('Position deltas calculated:', deltas.map(delta => ({
    suggestionId: delta.suggestionId,
    oldPosition: `${delta.oldStartOffset}-${delta.oldEndOffset}`,
    newPosition: `${delta.newStartOffset}-${delta.newEndOffset}`,
    isValid: delta.isValid,
    requiresUpdate: delta.requiresUpdate
  })));

  return deltas;
}

/**
 * Example: Integration with existing suggestion manager
 */
export async function integrateWithSuggestionManagerExample(
  postId: string,
  oldContent: string,
  newContent: string,
  currentSuggestions: Suggestion[]
) {
  // Step 1: Track content changes
  const contentDiff = suggestionRecalculationService.trackContentChange(oldContent, newContent);

  if (contentDiff.oldText === '' && contentDiff.newText === '') {
    // No changes detected
    return currentSuggestions;
  }

  // Step 2: Calculate position deltas
  const deltas = suggestionRecalculationService.calculatePositionDeltas([contentDiff], currentSuggestions);

  // Step 3: Update suggestion positions
  const updatedSuggestions = suggestionRecalculationService.recalculateSuggestionPositions(
    currentSuggestions,
    deltas
  );

  // Step 4: Remove invalid suggestions
  const changedRanges = [{
    startOffset: contentDiff.startOffset,
    endOffset: contentDiff.type === 'insert' ? contentDiff.startOffset : contentDiff.endOffset
  }];

  const validSuggestions = suggestionRecalculationService.invalidateOverlappingSuggestions(
    updatedSuggestions,
    changedRanges
  );

  // Step 5: Request new suggestions if significant changes were made
  if (contentDiff.newText.length >= 5) {
    try {
      await suggestionRecalculationService.requestNewSuggestions(postId, contentDiff.newText);
      console.log('New suggestions requested for changed content');
    } catch (error) {
      console.warn('Failed to request new suggestions:', error);
    }
  }

  return validSuggestions;
}

/**
 * Example: Configuration customization
 */
export function customizeRecalculationServiceExample() {
  // Create a custom service instance with specific configuration
  const customService = new (await import('./SuggestionRecalculationService')).SuggestionRecalculationService({
    enablePositionUpdates: true,
    enableInvalidation: true,
    enableNewSuggestionRequests: false, // Disable automatic new suggestion requests
    minChangedRangeLength: 10, // Require at least 10 characters for new suggestions
    maxChangedRangeLength: 500 // Limit to 500 characters per request
  });

  console.log('Custom service configuration:', customService.getConfig());

  return customService;
}
