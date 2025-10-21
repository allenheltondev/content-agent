import type { Suggestion } from '../types';

/**
 * Validate suggestion positions against content
 */
export function validateSuggestionPositions(suggestions: Suggestion[], content: string): {
  valid: Suggestion[];
  invalid: Array<{ suggestion: Suggestion; reason: string; actualText: string }>;
} {
  const valid: Suggestion[] = [];
  const invalid: Array<{ suggestion: Suggestion; reason: string; actualText: string }> = [];

  for (const suggestion of suggestions) {
    const { startOffset, endOffset, textToReplace } = suggestion;

    // Check bounds
    if (startOffset < 0) {
      invalid.push({
        suggestion,
        reason: 'Start offset is negative',
        actualText: ''
      });
      continue;
    }

    if (endOffset > content.length) {
      invalid.push({
        suggestion,
        reason: 'End offset exceeds content length',
        actualText: content.substring(startOffset, Math.min(endOffset, content.length))
      });
      continue;
    }

    if (startOffset >= endOffset) {
      invalid.push({
        suggestion,
        reason: 'Start offset is greater than or equal to end offset',
        actualText: ''
      });
      continue;
    }

    // Check if the text at the position matches what the suggestion expects
    const actualText = content.substring(startOffset, endOffset);

    if (actualText !== textToReplace) {
      invalid.push({
        suggestion,
        reason: `Text mismatch: expected "${textToReplace}", found "${actualText}"`,
        actualText
      });
      continue;
    }

    valid.push(suggestion);
  }

  return { valid, invalid };
}

/**
 * Find the correct position for a suggestion with mismatched text
 */
export function findCorrectPosition(suggestion: Suggestion, content: string): {
  found: boolean;
  startOffset?: number;
  endOffset?: number;
  confidence: number;
} {
  const { textToReplace } = suggestion;

  if (!textToReplace || textToReplace.length === 0) {
    return { found: false, confidence: 0 };
  }

  // Try to find exact match
  const exactIndex = content.indexOf(textToReplace);
  if (exactIndex !== -1) {
    return {
      found: true,
      startOffset: exactIndex,
      endOffset: exactIndex + textToReplace.length,
      confidence: 1.0
    };
  }

  // Try to find partial matches (for cases where content has changed slightly)
  const words = textToReplace.split(/\s+/).filter(word => word.length > 2);
  if (words.length === 0) {
    return { found: false, confidence: 0 };
  }

  let bestMatch = { found: false, confidence: 0, startOffset: 0, endOffset: 0 };

  // Look for sequences of words
  for (let i = 0; i < words.length; i++) {
    const wordSequence = words.slice(i, Math.min(i + 3, words.length)).join(' ');
    const index = content.indexOf(wordSequence);

    if (index !== -1) {
      const confidence = wordSequence.length / textToReplace.length;
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          found: true,
          startOffset: index,
          endOffset: index + wordSequence.length,
          confidence
        };
      }
    }
  }

  return bestMatch.found ? bestMatch : { found: false, confidence: 0 };
}

/**
 * Auto-correct suggestion positions
 */
export function autoCorrectSuggestionPositions(suggestions: Suggestion[], content: string): {
  corrected: Suggestion[];
  uncorrectable: Suggestion[];
} {
  const corrected: Suggestion[] = [];
  const uncorrectable: Suggestion[] = [];

  for (const suggestion of suggestions) {
    const validation = validateSuggestionPositions([suggestion], content);

    if (validation.valid.length > 0) {
      corrected.push(suggestion);
      continue;
    }

    // Try to find correct position
    const correction = findCorrectPosition(suggestion, content);

    if (correction.found && correction.confidence > 0.5) { // Lower threshold for better recovery
      corrected.push({
        ...suggestion,
        startOffset: correction.startOffset!,
        endOffset: correction.endOffset!
      });

      console.log(`Auto-corrected suggestion position for "${suggestion.textToReplace}":`, {
        original: { start: suggestion.startOffset, end: suggestion.endOffset },
        corrected: { start: correction.startOffset, end: correction.endOffset },
        confidence: correction.confidence
      });
    } else {
      // Try a more lenient approach - if the text is very short, just find any occurrence
      if (suggestion.textToReplace.length <= 10) {
        const simpleIndex = content.indexOf(suggestion.textToReplace);
        if (simpleIndex !== -1) {
          corrected.push({
            ...suggestion,
            startOffset: simpleIndex,
            endOffset: simpleIndex + suggestion.textToReplace.length
          });
          console.log(`Auto-corrected short suggestion "${suggestion.textToReplace}" using simple search`);
          continue;
        }
      }

      uncorrectable.push(suggestion);
      console.warn(`Could not auto-correct suggestion position for "${suggestion.textToReplace}":`, {
        original: { start: suggestion.startOffset, end: suggestion.endOffset },
        actualText: content.substring(
          Math.max(0, suggestion.startOffset),
          Math.min(content.length, suggestion.endOffset)
        ),
        confidence: correction.confidence
      });
    }
  }

  return { corrected, uncorrectable };
}

/**
 * Debug suggestion positions by logging detailed information
 */
export function debugSuggestionPositions(suggestions: Suggestion[], content: string): void {
  console.group('Suggestion Position Debug');

  const validation = validateSuggestionPositions(suggestions, content);

  console.log(`Total suggestions: ${suggestions.length}`);
  console.log(`Valid suggestions: ${validation.valid.length}`);
  console.log(`Invalid suggestions: ${validation.invalid.length}`);

  if (validation.invalid.length > 0) {
    console.group('Invalid Suggestions');
    validation.invalid.forEach(({ suggestion, reason, actualText }) => {
      console.log(`Suggestion ${suggestion.id}:`, {
        reason,
        expected: suggestion.textToReplace,
        actual: actualText,
        position: { start: suggestion.startOffset, end: suggestion.endOffset },
        type: suggestion.type
      });
    });
    console.groupEnd();
  }

  console.groupEnd();
}
