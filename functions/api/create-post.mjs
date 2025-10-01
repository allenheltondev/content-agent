import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { formatResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

// Zod schema for request validation
const createPostSchema = z.object({
  title: z.string().max(200).optional().default(''),
  body: z.string().max(50000).optional().default(''),
  status: z.enum(['draft', 'review', 'finalized', 'published', 'abandoned']).optional().default('draft')
});

export const handler = async (event) => {
  console.log('Create post event:', JSON.stringify(event, null, 2));

  try {
    // Extract tenantId from authorizer context
    const { tenantId, userId } = event.requestContext.authorizer;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return formatResponse(400, { error: 'Invalid JSON in request body' });
    }

    // Validate request body using Zod
    const validationResult = createPostSchema.safeParse(requestBody);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return formatResponse(400, {
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    const { title, body, status } = validationResult.data;

    // Generate unique contentId
    const contentId = randomUUID();
    const now = Date.now();

    // Create blog post item
    const post = {
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
      updatedAt: now,
      authorId: userId
    };

    console.log('Creating post:', { contentId, tenantId, title: title.substring(0, 50) });

    // Store new post in DynamoDB with proper key structure
    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(post),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }));

    // Return created post with timestamps and metadata
    const responsePost = {
      id: contentId,
      title,
      body,
      status,
      version: 1,
      createdAt: now,
      updatedAt: now,
      authorId: userId
    };

    console.log('Post created successfully:', { contentId, tenantId });

    return formatResponse(201, responsePost);

  } catch (error) {
    console.error('Create post error:', error);

    // Handle conditional check failed (duplicate post)
    if (error.name === 'ConditionalCheckFailedException') {
      return formatResponse(409, { error: 'Post already exists' });
    }

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
