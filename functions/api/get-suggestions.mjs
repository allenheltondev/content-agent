import { DynamoDBClient, GetItemCommand, QueryCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';
import { getMostRecentSummary } from '../utils/content.mjs';
import { bulkUpdateSuggestionStatuses } from '../utils/tenant-statistics.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { postId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const postResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      })
    }));

    if (!postResponse.Item) {
      console.warn('Post not found or access denied:', { tenantId, postId });
      return formatResponse(404, { message: 'Post not found' });
    }

    const suggestionsResponse = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :suggestionPrefix)',
      FilterExpression: 'attribute_not_exists(#status) OR #status = :pendingStatus',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':pk': { S: `${tenantId}#${postId}` },
        ':suggestionPrefix': { S: 'suggestion#' },
        ':pendingStatus': { S: 'pending' }
      }
    }));

    const allSuggestions = suggestionsResponse.Items?.map(item => {
      const unmarshalled = unmarshall(item);
      return {
        id: unmarshalled.suggestionId,
        contentId: unmarshalled.contentId,
        startOffset: unmarshalled.startOffset,
        endOffset: unmarshalled.endOffset,
        textToReplace: unmarshalled.textToReplace,
        replaceWith: unmarshalled.replaceWith,
        reason: unmarshalled.reason,
        priority: unmarshalled.priority,
        type: unmarshalled.type,
        contextBefore: unmarshalled.contextBefore,
        contextAfter: unmarshalled.contextAfter,
        anchorText: unmarshalled.anchorText,
        status: unmarshalled.status || 'pending',
        createdAt: unmarshalled.createdAt,
        updatedAt: unmarshalled.updatedAt
      };
    }) || [];

    // Deduplicate suggestions based on contextBefore, contextAfter, and anchorText
    const { suggestions, duplicatesRemoved } = await deduplicateSuggestions(tenantId, postId, allSuggestions);

    const summary = await getMostRecentSummary(tenantId, postId);
    return formatResponse(200, {
      suggestions,
      ...(summary && { summary })
    });
  } catch (error) {
    console.error('Get suggestions error:', error);

    return formatResponse(500, { message: 'Something went wrong' });
  }
};

/**
 * Deduplicates suggestions based on contextBefore, contextAfter, and anchorText
 * Keeps the first suggestion from each group and deletes duplicates from DynamoDB
 * @param {string} tenantId - The tenant identifier
 * @param {string} postId - The post identifier
 * @param {Array} suggestions - Array of suggestion objects
 * @returns {Promise<{suggestions: Array, duplicatesRemoved: number}>}
 */
const deduplicateSuggestions = async (tenantId, postId, suggestions) => {
  if (!suggestions || suggestions.length === 0) {
    return { suggestions: [], duplicatesRemoved: 0 };
  }

  // Group suggestions by their context signature
  const contextGroups = new Map();

  suggestions.forEach(suggestion => {
    // Handle null/undefined context values gracefully
    const contextBefore = suggestion.contextBefore || '';
    const anchorText = suggestion.anchorText || '';
    const contextAfter = suggestion.contextAfter || '';

    const contextKey = `${contextBefore}|${anchorText}|${contextAfter}`;

    if (!contextGroups.has(contextKey)) {
      contextGroups.set(contextKey, []);
    }
    contextGroups.get(contextKey).push(suggestion);
  });

  const uniqueSuggestions = [];
  const duplicatesToDelete = [];
  const statisticsUpdates = [];

  // Process each group - keep first, mark others for deletion
  for (const [contextKey, group] of contextGroups) {
    if (group.length === 1) {
      // No duplicates in this group
      uniqueSuggestions.push(group[0]);
    } else {
      // Sort by creation date to keep the earliest one
      group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      // Keep the first (earliest) suggestion
      uniqueSuggestions.push(group[0]);

      // Mark the rest for deletion
      for (let i = 1; i < group.length; i++) {
        duplicatesToDelete.push(group[i]);
        statisticsUpdates.push({
          suggestionType: group[i].type,
          newStatus: 'deleted',
          oldStatus: group[i].status
        });
      }
    }
  }

  // Delete duplicates from DynamoDB
  if (duplicatesToDelete.length > 0) {
    console.log(`Found ${duplicatesToDelete.length} duplicate suggestions for post ${postId}. Original count: ${suggestions.length}, unique count: ${uniqueSuggestions.length}`);

    try {
      // Delete duplicates in parallel
      await Promise.all(duplicatesToDelete.map(async (duplicate) => {
        await ddb.send(new DeleteItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall({
            pk: `${tenantId}#${postId}`,
            sk: `suggestion#${duplicate.id}`
          })
        }));
      }));

      // Update statistics to reflect the deletions
      if (statisticsUpdates.length > 0) {
        await bulkUpdateSuggestionStatuses(tenantId, statisticsUpdates);
      }

      console.log(`Successfully removed ${duplicatesToDelete.length} duplicate suggestions`);
    } catch (error) {
      console.error('Error deleting duplicate suggestions:', error);
      // Continue with the deduplicated list even if deletion fails
    }
  } else {
    console.log(`No duplicate suggestions found for post ${postId}`);
  }

  return {
    suggestions: uniqueSuggestions,
    duplicatesRemoved: duplicatesToDelete.length
  };
};


