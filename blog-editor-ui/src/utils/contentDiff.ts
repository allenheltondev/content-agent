import type { ContentDiff } from '../types';

/**
 * Content diff calculation utilities for tracking changes between Edit and Review modes
 */

/**
 * Cache for diff calculations to improve performance
 */
const diffCache = new Map<string, ContentDiff[]>();
const MAX_CACHE_SIZE = 100;
const LARGE_DOCUMENT_THRESHOLD = 10000; // 10KB

/**
 * Generate a cache key for diff calculation
 */
function generateDiffCacheKey(oldContent: string, newContent: string): string {
  // Use a simple hash for cache key to avoid storing large strings
  const oldHash = hashString(oldContent);
  const newHash = hashString(newContent);
  return `${oldHash}:${newHash}`;
}

/**
 * Simple string hashing function
 */
function hashString(str: string): string {
  let hash = 0;
  if (str.length === 0) return hash.toString();

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Optimized diff algorithm for large documents using line-based comparison
 */
function calculateLargeDocumentDiff(oldContent: string, newContent: string): ContentDiff[] {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const diffs: ContentDiff[] = [];

  let oldLineIndex = 0;
  let newLineIndex = 0;
  let oldCharOffset = 0;
  let newCharOffset = 0;

  // Find common prefix lines
  while (oldLineIndex < oldLines.length &&
         newLineIndex < newLines.length &&
         oldLines[oldLineIndex] === newLines[newLineIndex]) {
    oldCharOffset += oldLines[oldLineIndex].length + 1; // +1 for newline
    newCharOffset += newLines[newLineIndex].length + 1;
    oldLineIndex++;
    newLineIndex++;
  }

  // Find common suffix lines
  let oldEndLine = oldLines.length;
  let newEndLine = newLines.length;
  while (oldEndLine > oldLineIndex &&
         newEndLine > newLineIndex &&
         oldLines[oldEndLine - 1] === newLines[newEndLine - 1]) {
    oldEndLine--;
    newEndLine--;
  }

  // Calculate character offsets for the end
  let oldEndOffset = oldContent.length;
  let newEndOffset = newContent.length;

  if (oldEndLine < oldLines.length) {
    oldEndOffset = oldLines.slice(0, oldEndLine).join('\n').length;
    if (oldEndLine > 0) oldEndOffset += 1; // Add newline
  }

  if (newEndLine < newLines.length) {
    newEndOffset = newLines.slice(0, newEndLine).join('\n').length;
    if (newEndLine > 0) newEndOffset += 1; // Add newline
  }

  // Create diff for the changed section
  if (oldLineIndex < oldEndLine || newLineIndex < newEndLine) {
    const oldText = oldLines.slice(oldLineIndex, oldEndLine).join('\n');
    const newText = newLines.slice(newLineIndex, newEndLine).join('\n');

    let diffType: ContentDiff['type'];
    if (oldText.length === 0) {
      diffType = 'insert';
    } else if (newText.length === 0) {
      diffType = 'delete';
    } else {
      diffType = 'replace';
    }

    diffs.push({
      type: diffType,
      startOffset: oldCharOffset,
      endOffset: oldEndOffset,
      oldText,
      newText,
      timestamp: Date.now()
    });
  }

  return diffs;
}

/**
 * Calculate the differences between two text strings
 * Uses optimized algorithms based on document size
 */
export function calculateContentDiff(oldContent: string, newContent: string): ContentDiff[] {
  if (oldContent === newContent) {
    return [];
  }

  // Check cache first
  const cacheKey = generateDiffCacheKey(oldContent, newContent);
  const cached = diffCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  let diffs: ContentDiff[];

  // Use different algorithms based on document size
  const isLargeDocument = oldContent.length > LARGE_DOCUMENT_THRESHOLD ||
                         newContent.length > LARGE_DOCUMENT_THRESHOLD;

  if (isLargeDocument) {
    diffs = calculateLargeDocumentDiff(oldContent, newContent);
  } else {
    diffs = calculateSmallDocumentDiff(oldContent, newContent);
  }

  // Cache the result
  if (diffCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry (simple FIFO)
    const firstKey = diffCache.keys().next().value;
    diffCache.delete(firstKey);
  }
  diffCache.set(cacheKey, diffs);

  return diffs;
}

/**
 * Original character-based diff algorithm for small documents
 */
function calculateSmallDocumentDiff(oldContent: string, newContent: string): ContentDiff[] {
  const diffs: ContentDiff[] = [];
  const oldLength = oldContent.length;
  const newLength = newContent.length;

  let oldIndex = 0;
  let newIndex = 0;

  // Find common prefix
  while (oldIndex < oldLength && newIndex < newLength && oldContent[oldIndex] === newContent[newIndex]) {
    oldIndex++;
    newIndex++;
  }

  // Find common suffix
  let oldEnd = oldLength;
  let newEnd = newLength;
  while (oldEnd > oldIndex && newEnd > newIndex && oldContent[oldEnd - 1] === newContent[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }

  // Create diff for the changed section
  if (oldIndex < oldEnd || newIndex < newEnd) {
    const oldText = oldContent.slice(oldIndex, oldEnd);
    const newText = newContent.slice(newIndex, newEnd);

    let diffType: ContentDiff['type'];
    if (oldText.length === 0) {
      diffType = 'insert';
    } else if (newText.length === 0) {
      diffType = 'delete';
    } else {
      diffType = 'replace';
    }

    diffs.push({
      type: diffType,
      startOffset: oldIndex,
      endOffset: oldEnd,
      oldText,
      newText,
      timestamp: Date.now()
    });
  }

  return diffs;
}

/**
 * Merge multiple content diffs into a consolidated list
 * Removes overlapping diffs and combines adjacent changes
 */
export function mergeContentDiffs(diffs: ContentDiff[]): ContentDiff[] {
  if (diffs.length <= 1) {
    return [...diffs];
  }

  // Sort diffs by start offset
  const sortedDiffs = [...diffs].sort((a, b) => a.startOffset - b.startOffset);
  const merged: ContentDiff[] = [];

  let current = sortedDiffs[0];

  for (let i = 1; i < sortedDiffs.length; i++) {
    const next = sortedDiffs[i];

    // Check if diffs overlap or are adjacent
    if (current.endOffset >= next.startOffset) {
      // Merge the diffs
      current = {
        type: 'replace', // Merged diffs are always replacements
        startOffset: Math.min(current.startOffset, next.startOffset),
        endOffset: Math.max(current.endOffset, next.endOffset),
        oldText: current.oldText + next.oldText,
        newText: current.newText + next.newText,
        timestamp: Math.max(current.timestamp, next.timestamp)
      };
    } else {
      // No overlap, add current to merged list and move to next
      merged.push(current);
      current = next;
    }
  }

  // Add the last diff
  merged.push(current);

  return merged;
}

/**
 * Check if content has significant changes (ignoring whitespace-only changes)
 */
export function hasSignificantChanges(diffs: ContentDiff[]): boolean {
  return diffs.some(diff => {
    const oldTrimmed = diff.oldText.trim();
    const newTrimmed = diff.newText.trim();
    return oldTrimmed !== newTrimmed;
  });
}

/**
 * Get the total number of characters changed
 */
export function getTotalChangedCharacters(diffs: ContentDiff[]): number {
  return diffs.reduce((total, diff) => {
    return total + Math.max(diff.oldText.length, diff.newText.length);
  }, 0);
}

/**
 * Get a summary of changes for display purposes
 */
export function getChangeSummary(diffs: ContentDiff[]): string {
  if (diffs.length === 0) {
    return 'No changes';
  }

  const insertions = diffs.filter(d => d.type === 'insert').length;
  const deletions = diffs.filter(d => d.type === 'delete').length;
  const replacements = diffs.filter(d => d.type === 'replace').length;

  const parts: string[] = [];
  if (insertions > 0) parts.push(`${insertions} insertion${insertions > 1 ? 's' : ''}`);
  if (deletions > 0) parts.push(`${deletions} deletion${deletions > 1 ? 's' : ''}`);
  if (replacements > 0) parts.push(`${replacements} change${replacements > 1 ? 's' : ''}`);

  return parts.join(', ');
}

/**
 * Apply content diffs to calculate the new content
 * Useful for validation and testing
 */
export function applyContentDiffs(originalContent: string, diffs: ContentDiff[]): string {
  if (diffs.length === 0) {
    return originalContent;
  }

  // Sort diffs by start offset in reverse order to avoid offset issues
  const sortedDiffs = [...diffs].sort((a, b) => b.startOffset - a.startOffset);

  let result = originalContent;

  for (const diff of sortedDiffs) {
    const before = result.slice(0, diff.startOffset);
    const after = result.slice(diff.endOffset);
    result = before + diff.newText + after;
  }

  return result;
}
