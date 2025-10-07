import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { formatResponse } from '../utils/responses.mjs';
import { incrementPostCount } from '../utils/tenant-statistics.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return formatResponse(400, { error: 'Invalid JSON in request body' });
    }

    const { title, body, status } = requestBody;

    const contentId = randomUUID();
    const now = Date.now();

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: `${tenantId}#${contentId}`,
        sk: 'content',
        GSI1PK: tenantId,
        GSI1SK: `content#${now}`,
        contentId,
        tenantId,
        title,
        body,
        status,
        version: 1,
        createdAt: now,
        updatedAt: now
      }),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }));

    try {
      await incrementPostCount(tenantId);
    } catch (postCountError) {
      console.error('Failed to increment post count for tenant:', tenantId, 'Error:', postCountError);
      // Continue with post creation - don't block on statistics update failure
    }

    // Return the created post in BlogPost format
    const blogPost = {
      id: contentId,
      title: title || '',
      body: body || '',
      status: status || 'draft',
      version: 1,
      createdAt: now,
      updatedAt: now,
      authorId: tenantId
    };

    return formatResponse(201, blogPost);

  } catch (error) {
    console.error('Create post error:', error);

    if (error.name === 'ConditionalCheckFailedException') {
      return formatResponse(409, { error: 'Post already exists' });
    }

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
