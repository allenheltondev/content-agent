import type { Suggestion } from '../types';

/**
 * Recalculate suggestion offsets after a text change
 * @param suggestions - Array of remaining suggestions
 * @param changeStartOffset - Start position of the text change
 * @param changeEndOffset - End position of the text change (original)
 * @param replacementText - The new text that was inserted
 * @returns Updated suggestions with corrected offsets
 */
export function recalculateSuggestionOffsets(
  suggestions: Suggestion[],
  changeStartOffset: number,
  changeEndOffset: number,
  replacementText: string
): Suggestion[] {
  const originalLength = changeEndOffset - changeStartOffset;
  const newLength = replacementText.length;
  const offsetDelta = newLength - originalLength;

  return suggestions
    .map((suggestion) => {
      // Skip suggestions that overlap with the changed region
      const suggestionOverlaps = !(
        suggestion.endOffset <= changeStartOffset ||
        suggestion.startOffset >= changeEndOffset
      );

      if (suggestionOverlaps) {
        // This suggestion overlaps with the change - it should be removed
        return null;
      }

      // Adjust suggestions that come after the change
      if (suggestion.startOffset >= changeEndOffset) {
        return {
          ...suggestion,
          startOffset: suggestion.startOffset + offsetDelta,
          endOffset: suggestion.endOffset + offsetDelta
        };
      }

      // Suggestions before the change remain unchanged
      return suggestion;
    })
    .filter((suggestion): suggestion is Suggestion => suggestion !== null);
}

/**
 * Validate that suggestion offsets are still valid for the given content
 * @param suggestions - Array of suggestions to validate
 * @param content - Current content string
 * @returns Array of valid suggestions with corrected text references
 */
export function validateSuggestionOffsets(
  suggestions: Suggestion[],
  content: string
): Suggestion[] {
  return suggestions
    .map((suggestion) => {
      // Check if offsets are within content bounds
      if (
        suggestion.startOffset < 0 ||
        suggestion.endOffset > content.length ||
        suggestion.startOffset >= suggestion.endOffset
      ) {
        console.warn(`Invalid suggestion offsets for suggestion ${suggestion.id}:`, {
          startOffset: suggestion.startOffset,
          endOffset: suggestion.endOffset,
          contentLength: content.length
        });
        return null;
      }

      // Extract the actual text at the current position
      const actualText = content.substring(suggestion.startOffset, suggestion.endOffset);

      // If the text doesn't match what the suggestion expects, try to find it nearby
      if (actualText !== suggestion.textToReplace) {
        console.warn(`Text mismatch for suggestion ${suggestion.id}:`, {
          expected: suggestion.textToReplace,
          actual: actualText,
          position: `${suggestion.startOffset}-${suggestion.endOffset}`
        });

        // Try to find the expected text within a small range
        const searchRange = 50; // Search within 50 characters
        const searchStart = Math.max(0, suggestion.startOffset - searchRange);
        const searchEnd = Math.min(content.length, suggestion.endOffset + searchRange);
        const searchText = content.substring(searchStart, searchEnd);
        const foundIndex = searchText.indexOf(suggestion.textToReplace);

        if (foundIndex !== -1) {
          // Found the text nearby, update the offsets
          const newStartOffset = searchStart + foundIndex;
          const newEndOffset = newStartOffset + suggestion.textToReplace.length;

          console.log(`Corrected suggestion ${suggestion.id} offsets:`, {
            old: `${suggestion.startOffset}-${suggestion.endOffset}`,
            new: `${newStartOffset}-${newEndOffset}`
          });

          return {
            ...suggestion,
            startOffset: newStartOffset,
            endOffset: newEndOffset
          };
        } else {
          // Try more advanced text matching strategies
          const correctedSuggestion = findCorrectTextPosition(suggestion, content);
          if (correctedSuggestion) {
            console.log(`Corrected suggestion ${suggestion.id} using ${correctedSuggestion.correctionStrategy}:`, {
              old: `${suggestion.startOffset}-${suggestion.endOffset}`,
              new: `${correctedSuggestion.startOffset}-${correctedSuggestion.endOffset}`
            });
            return correctedSuggestion;
          } else {
            // Can't find the text, this suggestion is no longer valid
            console.warn(`Removing invalid suggestion ${suggestion.id} - text not found`);
            return null;
          }
        }
      }

      // Suggestion is valid as-is
      return suggestion;
    })
    .filter((suggestion): suggestion is Suggestion => suggestion !== null);
}

/**
 * Apply a suggestion to content and recalculate remaining suggestion offsets
 * @param content - Current content
 * @param suggestionToApply - The suggestion to apply
 * @param remainingSuggestions - Other suggestions that need offset adjustment
 * @returns Object with new content and updated suggestions
 */
export function applySuggestionWithOffsetRecalculation(
  content: string,
  suggestionToApply: Suggestion,
  remainingSuggestions: Suggestion[]
): {
  newContent: string;
  updatedSuggestions: Suggestion[];
} {
  // Apply the suggestion to create new content
  const newContent =
    content.substring(0, suggestionToApply.startOffset) +
    suggestionToApply.replaceWith +
    content.substring(suggestionToApply.endOffset);

  // Recalculate offsets for remaining suggestions
  const updatedSuggestions = recalculateSuggestionOffsets(
    remainingSuggestions,
    suggestionToApply.startOffset,
    suggestionToApply.endOffset,
    suggestionToApply.replaceWith
  );

  // Validate the updated suggestions against the new content
  const validatedSuggestions = validateSuggestionOffsets(updatedSuggestions, newContent);

  return {
    newContent,
    updatedSuggestions: validatedSuggestions
  };
}
/**
 * Try multiple strategies to find the correct position for a suggestion's text
 */
function findCorrectTextPosition(
  suggestion: Suggestion,
  content: string
): (Suggestion & { correctionStrategy: string }) | null {
  const { textToReplace, startOffset, endOffset } = suggestion;

  // Strategy 1: Expanded search range
  const searchRange = Math.min(300, content.length / 3); // Search within 300 chars or 1/3 of content
  const searchStart = Math.max(0, startOffset - searchRange);
  const searchEnd = Math.min(content.length, endOffset + searchRange);
  const searchText = content.substring(searchStart, searchEnd);

  let foundIndex = searchText.indexOf(textToReplace);
  if (foundIndex !== -1) {
    const newStartOffset = searchStart + foundIndex;
    const newEndOffset = newStartOffset + textToReplace.length;
    return {
      ...suggestion,
      startOffset: newStartOffset,
      endOffset: newEndOffset,
      correctionStrategy: 'expanded-search'
    };
  }

  // Strategy 2: Case-insensitive search
  const lowerTextToReplace = textToReplace.toLowerCase();
  const lowerSearchText = searchText.toLowerCase();
  foundIndex = lowerSearchText.indexOf(lowerTextToReplace);
  if (foundIndex !== -1) {
    const newStartOffset = searchStart + foundIndex;
    const newEndOffset = newStartOffset + textToReplace.length;
    return {
      ...suggestion,
      startOffset: newStartOffset,
      endOffset: newEndOffset,
      correctionStrategy: 'case-insensitive'
    };
  }

  // Strategy 3: Normalize whitespace and try again
  const normalizedTextToReplace = textToReplace.replace(/\s+/g, ' ').trim();
  const normalizedSearchText = searchText.replace(/\s+/g, ' ');
  foundIndex = normalizedSearchText.indexOf(normalizedTextToReplace);
  if (foundIndex !== -1) {
    // Find the actual position in the original text
    let actualIndex = 0;
    let normalizedIndex = 0;
    while (normalizedIndex < foundIndex && actualIndex < searchText.length) {
      if (searchText[actualIndex].match(/\s/)) {
        // Skip multiple whitespace characters
        while (actualIndex < searchText.length && searchText[actualIndex].match(/\s/)) {
          actualIndex++;
        }
        normalizedIndex++;
      } else {
        actualIndex++;
        normalizedIndex++;
      }
    }

    const newStartOffset = searchStart + actualIndex;
    const newEndOffset = newStartOffset + textToReplace.length;
    return {
      ...suggestion,
      startOffset: newStartOffset,
      endOffset: newEndOffset,
      correctionStrategy: 'whitespace-normalized'
    };
  }

  // Strategy 4: Try to match by key words (for longer text)
  if (textToReplace.length > 10) {
    const words = textToReplace.split(/\s+/).filter(word => word.length > 3);
    if (words.length >= 2) {
      const firstWord = words[0];
      const lastWord = words[words.length - 1];

      let searchIndex = 0;
      while (searchIndex < searchText.length) {
        const firstWordIndex = searchText.indexOf(firstWord, searchIndex);
        if (firstWordIndex === -1) break;

        const lastWordIndex = searchText.indexOf(lastWord, firstWordIndex + firstWord.length);
        if (lastWordIndex !== -1) {
          const candidateStart = searchStart + firstWordIndex;
          const candidateEnd = searchStart + lastWordIndex + lastWord.length;
          const candidateText = content.substring(candidateStart, candidateEnd);

          // Check if this looks like a reasonable match
          if (Math.abs(candidateText.length - textToReplace.length) <= textToReplace.length * 0.4) {
            return {
              ...suggestion,
              startOffset: candidateStart,
              endOffset: candidateEnd,
              textToReplace: candidateText, // Update to match actual text
              correctionStrategy: 'keyword-match'
            };
          }
        }

        searchIndex = firstWordIndex + 1;
      }
    }
  }

  // Strategy 5: Global search as last resort
  foundIndex = content.indexOf(textToReplace);
  if (foundIndex !== -1) {
    const newStartOffset = foundIndex;
    const newEndOffset = newStartOffset + textToReplace.length;
    return {
      ...suggestion,
      startOffset: newStartOffset,
      endOffset: newEndOffset,
      correctionStrategy: 'global-search'
    };
  }

  return null;
}
