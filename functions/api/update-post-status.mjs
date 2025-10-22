import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, formatEmptyResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { postId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    if (!postId) {
      console.error('Missing postId in path parameters');
      return formatResponse(400, { error: 'Missing postId' });
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return formatResponse(400, { error: 'Invalid JSON in request body' });
    }

    const { status } = requestBody;

    // Validate status field
    if (!status) {
      return formatResponse(400, { error: 'Missing status field' });
    }

    if (!['Draft', 'Complete'].includes(status)) {
      return formatResponse(400, { error: 'Invalid status value. Allowed values: Draft, Complete' });
    }

    console.log('update-post-status: initiated', {
      tenantId,
      postId,
      status
    });

    // Check if post exists and belongs to tenant
    const postKey = {
      pk: `${tenantId}#${postId}`,
      sk: 'content'
    };

    const getResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall(postKey)
    }));

    if (!getResponse.Item) {
      console.warn('Post not found or access denied:', { tenantId, postId });
      return formatResponse(404, { error: 'Post not found' });
    }

    const post = unmarshall(getResponse.Item);
    const currentStatus = post.status;

    // If status is already the same, return success without updating
    if (currentStatus === status) {
      console.log('Post status already matches requested status:', { tenantId, postId, status });
      return formatEmptyResponse();
    }

    // Update status and timestamp only (don't increment version for status changes)
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall(postKey),
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: marshall({
        ':status': status,
        ':updatedAt': Date.now()
      }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }));

    console.log('update-post-status: completed', {
      tenantId,
      postId,
      from: currentStatus,
      to: status
    });

    return formatEmptyResponse();

  } catch (error) {
    console.error('Update post status error:', error);

    if (error.name === 'ConditionalCheckFailedException') {
      return formatResponse(404, { error: 'Post not found' });
    }

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
