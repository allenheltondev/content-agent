import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, formatEmptyResponse } from '../utils/responses.mjs';
import { decrementPostCount } from '../utils/tenant-statistics.mjs';

const ddb = new DynamoDBClient();
const eventbridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { postId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const getResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      })
    }));

    if (!getResponse.Item) {
      console.warn('Post not found:', { tenantId, postId });
      return formatResponse(404, { error: 'Post not found' });
    }

    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }));

    try {
      await decrementPostCount(tenantId);
      console.log('Post count decremented successfully for tenant:', tenantId);
    } catch (error) {
      console.error('Failed to decrement post count for tenant:', tenantId, error);
      // Don't block post deletion on statistics update failure
    }

    try {
      await eventbridge.send(new PutEventsCommand({
        Entries: [{
          DetailType: 'Delete Post',
          Source: 'content-agent',
          Detail: JSON.stringify({ tenantId, postId })
        }]
      }));

    } catch (error) {
      console.error('Failed to trigger async cleanup:', { postId, tenantId, error: error.message });
      // Don't block post deletion on async cleanup invocation failure
    }

    return formatEmptyResponse(204);

  } catch (error) {
    console.error('Delete post error:', error);

    if (error.name === 'ConditionalCheckFailedException') {
      return formatResponse(404, { error: 'Post not found' });
    }

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
