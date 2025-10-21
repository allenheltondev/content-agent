import { DynamoDBClient, GetItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';

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
        status: unmarshalled.status || 'pending',
        createdAt: unmarshalled.createdAt,
        updatedAt: unmarshalled.updatedAt
      };
    }) || [];

    const summary = await getSummary(tenantId, postId, postResponse.Item.version.N);
    return formatResponse(200, {
      suggestions,
      ...(summary && { summary })
    });
  } catch (error) {
    console.error('Get suggestions error:', error);

    return formatResponse(500, { message: 'Something went wrong' });
  }
};

const getSummary = async (tenantId, contentId, version) => {
  const response = await ddb.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: `${tenantId}#${contentId}`,
      sk: `summary#${version}`
    })
  }));

  if (response.Item) {
    return response.Item.summary.S;
  }
};
