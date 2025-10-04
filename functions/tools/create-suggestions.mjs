import { z } from 'zod';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { loadContent } from '../utils/content.mjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const ddb = new DynamoDBClient();
const CONTEXT_WINDOW = 30;
const OFFSET_TOLERANCE = 50;

export const createSuggestionsTool = {
  isMultiTenant: true,
  name: 'createSuggestions',
  description: 'Creates one or more suggested edits to a piece of written content',
  schema: z.object({
    contentId: z.string().describe('Identifier of the content'),
    suggestions: z.array(z.object({
      startOffset: z.number().int().describe('Starting character index in the content for the suggestion. Use -1 if unsure'),
      endOffset: z.number().int().describe('Ending character index in the content for the suggestion. Use -1 if unsure'),
      textToReplace: z.string().min(1).describe('The exact, case-sensitive text from the content that needs replacing'),
      replaceWith: z.string().describe('Suggested replacement text. Leave blank for a suggested deletion.'),
      reason: z.string().min(1).describe('Reason why the suggestion is made'),
      priority: z.enum(['low', 'medium', 'high']).describe('Importance level of the change'),
      type: z.enum(['llm', 'brand', 'fact', 'grammar', 'spelling']).describe('The type of suggestion being made')
    })).min(1).max(10)
  }),
  handler: async (tenantId, { contentId, suggestions }) => {
    try {
      let content;
      try {
        content = await loadContent(tenantId, contentId);
      } catch (e) {
        console.error(e);
        return e.message;
      }

      const results = await Promise.allSettled(suggestions.map(async (s) => {
        const offsets = findActualOffsets(content.body, s.textToReplace, s.startOffset);
        if (!offsets) {
          return;
        }
        const contextBefore = content.body.slice(Math.max(0, offsets.start - CONTEXT_WINDOW), offsets.start);
        const contextAfter = content.body.slice(offsets.end, Math.min(content.body.length, offsets.end + CONTEXT_WINDOW));
        const anchorText = content.body.slice(offsets.start, offsets.end);

        const contextHash = crypto
          .createHash("sha256")
          .update(`${contextBefore}|${anchorText}|${contextAfter}`)
          .digest("hex")
          .slice(0, 16);

        const id = uuidv4();
        await ddb.send(new PutItemCommand({
          TableName: process.env.TABLE_NAME,
          ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
          Item: marshall({
            pk: `${tenantId}#${contentId}`,
            sk: `suggestion#${id}`,
            contentVersion: content.version,
            contextBefore,
            contextAfter,
            anchorText,
            contextHash,
            startOffset: offsets.start,
            endOffset: offsets.end,
            textToReplace: s.textToReplace,
            replaceWith: s.replaceWith,
            reason: s.reason,
            priority: s.priority,
            type: s.type,
            createdAt: Date.now(),
            ttl: Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60) // 3 day TTL
          })
        }));

        return { id };
      }));

      results.filter(r => r.status == 'rejected').map(error => {
        console.error(error.reason);
      });

      const created = results.filter(r => r.status == 'fulfilled' && r.value).length;
      console.log(`Created ${created}`);
      return `${created} suggestions added.`;
    }
    catch (err) {
      console.error(err);
      return 'Something went wrong';
    }
  }
};

/**
 * Finds the actual start and end offsets for text replacement with tolerance
 * @param {string} content - The full content to search in
 * @param {string} textToReplace - The text to find
 * @param {number} suggestedStartOffset - The LLM-suggested start offset (-1 if unknown)
 * @returns {{startOffset: number, endOffset: number}} - The actual offsets
 * @throws {Error} - If text is not found or validation fails
 */
const findActualOffsets = (content, textToReplace, suggestedStartOffset) => {
  let actualStartOffset = -1;
  let actualEndOffset = -1;

  // If startOffset is provided and valid, use it as a reference point
  if (suggestedStartOffset >= 0 && suggestedStartOffset < content.length) {
    // Look for the text starting from the suggested offset with tolerance
    const searchStart = Math.max(0, suggestedStartOffset - OFFSET_TOLERANCE);
    const searchEnd = Math.min(content.length, suggestedStartOffset + OFFSET_TOLERANCE + textToReplace.length);
    const searchSection = content.slice(searchStart, searchEnd);

    const relativeIndex = searchSection.indexOf(textToReplace);
    if (relativeIndex !== -1) {
      actualStartOffset = searchStart + relativeIndex;
      actualEndOffset = actualStartOffset + textToReplace.length;
    }
  }

  // If not found within tolerance or no valid startOffset provided, search entire content
  if (actualStartOffset === -1) {
    const firstOccurrence = content.indexOf(textToReplace);
    if (firstOccurrence === -1) {
      console.warn(`Text to replace not found: "${textToReplace}"`);
      return;
    }

    // If we have multiple occurrences and a suggested offset, find the closest one
    if (suggestedStartOffset >= 0) {
      let closestOffset = firstOccurrence;
      let closestDistance = Math.abs(firstOccurrence - suggestedStartOffset);

      let searchFrom = firstOccurrence + 1;
      while (searchFrom < content.length) {
        const nextOccurrence = content.indexOf(textToReplace, searchFrom);
        if (nextOccurrence === -1) break;

        const distance = Math.abs(nextOccurrence - suggestedStartOffset);
        if (distance < closestDistance) {
          closestOffset = nextOccurrence;
          closestDistance = distance;
        }

        searchFrom = nextOccurrence + 1;
      }

      actualStartOffset = closestOffset;
    } else {
      actualStartOffset = firstOccurrence;
    }

    actualEndOffset = actualStartOffset + textToReplace.length;
  }

  // Validate the calculated offsets
  if (actualEndOffset <= actualStartOffset) {
    throw new Error("Calculated endOffset must be > startOffset");
  }
  if (actualStartOffset < 0 || actualEndOffset > content.length) {
    throw new Error(`Calculated offsets out of bounds: [${actualStartOffset}, ${actualEndOffset}) for len ${content.length}`);
  }

  // Double-check that we're replacing the correct text
  const actualText = content.slice(actualStartOffset, actualEndOffset);
  if (actualText !== textToReplace) {
    throw new Error(`Text mismatch. Expected: "${textToReplace}", Found: "${actualText}"`);
  }

  return { start: actualStartOffset, end: actualEndOffset };
};
