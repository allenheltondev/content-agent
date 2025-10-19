import { DynamoDBClient, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { loadContent } from '../utils/content.mjs';
import { bulkUpdateSuggestionStatuses } from '../utils/tenant-statistics.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId, postId, version, bodyChanged, statusChanged, newStatus } = event.detail;

    if (!tenantId || !postId) {
      console.error('Missing required parameters:', { tenantId, postId });
      return;
    }

    const post = await loadContent(tenantId, postId);

    if (bodyChanged) {
      await processSuggestionValidation(tenantId, postId, post.body, version);
    }

    if (statusChanged && newStatus === 'published') {
      await handlePublishedStatus(tenantId, postId);
    }

    return ({ success: true });
  } catch (error) {
    console.error('Post processing error:', error);
    return { success: false };
  }
};

const processSuggestionValidation = async (tenantId, postId, currentBody, currentVersion) => {
  try {
    const suggestions = await getPendingSuggestions(tenantId, postId);
    const statisticsUpdates = [];

    for (const suggestion of suggestions) {
      try {
        const result = await validateAndUpdateSuggestion(suggestion, currentBody, currentVersion);
        if (result) {
          statisticsUpdates.push(result);
        }
      } catch (error) {
        console.error(`Error processing suggestion ${suggestion.suggestionId}:`, error);
        // Continue processing other suggestions
      }
    }

    if (statisticsUpdates.length > 0) {
      try {
        await bulkUpdateSuggestionStatuses(tenantId, statisticsUpdates);
      } catch (statsError) {
        console.error('Error updating bulk statistics:', statsError);
        // Don't fail the processing if statistics update fails
      }
    }
  } catch (error) {
    console.error('Error in suggestion validation process:', error);
    throw error;
  }
};

const getPendingSuggestions = async (tenantId, postId) => {
  try {
    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      FilterExpression: '#status = :status OR attribute_not_exists(#status)',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${postId}`,
        ':sk': 'suggestion#',
        ':status': 'pending'
      })
    }));

    return response.Items ? response.Items.map(item => unmarshall(item)) : [];
  } catch (error) {
    console.error('Error querying pending suggestions:', error);
    throw error;
  }
};

const validateAndUpdateSuggestion = async (suggestion, currentBody, currentVersion) => {
  const { anchorText, contextBefore, contextAfter, pk, sk, type, status } = suggestion;

  const isValid = validateSuggestionRelevance(currentBody, anchorText, contextBefore, contextAfter);

  if (isValid) {
    await updateSuggestionVersion(pk, sk, currentVersion);
    return null;
  } else {
    await updateSuggestionStatus(pk, sk, 'skipped');
    return {
      suggestionType: type || 'llm',
      newStatus: 'skipped',
      oldStatus: status || 'pending'
    };
  }
};

const validateSuggestionRelevance = (currentBody, anchorText, contextBefore, contextAfter) => {
  if (!anchorText || !currentBody) {
    return false;
  }

  if (!currentBody.includes(anchorText)) {
    return false;
  }

  if (contextBefore || contextAfter) {
    const contextPattern = `${contextBefore || ''}${anchorText}${contextAfter || ''}`;
    return currentBody.includes(contextPattern.trim());
  }

  return true;
};

const updateSuggestionVersion = async (pk, sk, version) => {
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk, sk }),
      UpdateExpression: 'SET version = :version, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':version': version,
        ':updatedAt': new Date().toISOString()
      })
    }));
  } catch (error) {
    console.error('Error updating suggestion version:', error);
    throw error;
  }
};

const updateSuggestionStatus = async (pk, sk, status) => {
  try {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk, sk }),
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':status': status,
        ':updatedAt': new Date().toISOString()
      })
    }));
  } catch (error) {
    console.error('Error updating suggestion status:', error);
    throw error;
  }
};

const handlePublishedStatus = async (tenantId, postId) => {
  try {
    const pendingSuggestions = await getPendingSuggestions(tenantId, postId);
    const statisticsUpdates = [];

    for (const suggestion of pendingSuggestions) {
      try {
        await updateSuggestionStatus(suggestion.pk, suggestion.sk, 'rejected');
        statisticsUpdates.push({
          suggestionType: suggestion.type || 'llm',
          newStatus: 'rejected',
          oldStatus: suggestion.status || 'pending'
        });
      } catch (error) {
        console.error(`Error rejecting suggestion ${suggestion.suggestionId}:`, error);
        // Continue processing other suggestions
      }
    }

    if (statisticsUpdates.length > 0) {
      try {
        await bulkUpdateSuggestionStatuses(tenantId, statisticsUpdates);
      } catch (statsError) {
        console.error('Error updating bulk statistics for rejected suggestions:', statsError);
        // Don't fail the processing if statistics update fails
      }
    }
  } catch (error) {
    console.error('Error handling published status:', error);
    throw error;
  }
};
