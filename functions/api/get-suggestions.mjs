import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  console.log('Get suggestions event:', JSON.stringify(event, null, 2));

  try {
    // Extract tenantId from authorizer context
    const { tenantId, userId } = event.requestContext.authorizer;

    // Extract postId from path parameters
    const postId = event.pathParameters?.id;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    if (!postId) {
      console.error('Missing postId in path parameters');
      return formatResponse(400, { error: 'Missing post ID' });
    }

    console.log('Getting suggestions for post:', { tenantId, postId });

    // First verify post ownership by checking if the post exists and belongs to the tenant
    const postResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      })
    }));

    if (!postResponse.Item) {
      console.log('Post not found or access denied:', { tenantId, postId });
      return formatResponse(403, { error: 'Access denied' });
    }

    // Query suggestions using composite key pattern
    const suggestionsResponse = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :suggestionPrefix)',
      ExpressionAttributeValues: {
        ':pk': { S: `${tenantId}#${postId}` },
        ':suggestionPrefix': { S: 'suggestion#' }
      }
    }));

    // Transform DynamoDB items to suggestion format
    const suggestions = suggestionsResponse.Items?.map(item => {
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
        createdAt: unmarshalled.createdAt
      };
    }) || [];

    console.log(`Found ${suggestions.length} suggestions for post ${postId} in tenant ${tenantId}`);

    return formatResponse(200, suggestions);

  } catch (error) {
    console.error('Get suggestions error:', error);

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
