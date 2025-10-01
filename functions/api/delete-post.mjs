import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, formatEmptyResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  console.log('Delete post event:', JSON.stringify(event, null, 2));

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

    console.log('Deleting post:', { tenantId, postId });

    // First, verify post ownership by getting the current item
    const getResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      })
    }));

    if (!getResponse.Item) {
      console.log('Post not found:', { tenantId, postId });
      return formatResponse(404, { error: 'Post not found' });
    }

    const currentPost = unmarshall(getResponse.Item);
    console.log('Post found, proceeding with deletion:', {
      postId,
      tenantId,
      title: currentPost.title?.substring(0, 50)
    });

    // Remove post from DynamoDB using composite key
    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }));

    console.log('Post deleted successfully:', { postId, tenantId });

    // Return 204 status code on successful deletion
    return formatEmptyResponse();

  } catch (error) {
    console.error('Delete post error:', error);

    // Handle conditional check failed (post doesn't exist)
    if (error.name === 'ConditionalCheckFailedException') {
      return formatResponse(404, { error: 'Post not found' });
    }

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
