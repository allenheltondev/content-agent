import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { z } from 'zod';
import { formatResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

// Zod schema for request validation
const updatePostSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(50000).optional(),
  status: z.enum(['draft', 'review', 'finalized', 'published', 'abandoned']).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update"
});

export const handler = async (event) => {
  console.log('Update post event:', JSON.stringify(event, null, 2));

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

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Invalid JSON in request body:', parseError);
      return formatResponse(400, { error: 'Invalid JSON in request body' });
    }

    // Validate request body using Zod
    const validationResult = updatePostSchema.safeParse(requestBody);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error);
      return formatResponse(400, {
        error: 'Validation failed',
        details: validationResult.error.errors
      });
    }

    const updateData = validationResult.data;

    console.log('Updating post:', { tenantId, postId, updateData });

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

    // Build update expression dynamically
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (updateData.title !== undefined) {
      updateExpressions.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = { S: updateData.title };
    }

    if (updateData.body !== undefined) {
      updateExpressions.push('#body = :body');
      expressionAttributeNames['#body'] = 'body';
      expressionAttributeValues[':body'] = { S: updateData.body };
    }

    if (updateData.status !== undefined) {
      updateExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = { S: updateData.status };
    }

    // Always update version and updatedAt
    updateExpressions.push('#version = #version + :one');
    updateExpressions.push('#updatedAt = :updatedAt');

    expressionAttributeNames['#version'] = 'version';
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':one'] = { N: '1' };
    expressionAttributeValues[':updatedAt'] = { N: Date.now().toString() };

    // Update post in DynamoDB and increment version number
    const updateResponse = await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      }),
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    }));

    // Transform updated item to response format
    const updatedItem = unmarshall(updateResponse.Attributes);
    const updatedPost = {
      id: updatedItem.contentId,
      title: updatedItem.title || '',
      body: updatedItem.body || '',
      status: updatedItem.status || 'draft',
      version: updatedItem.version || 1,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
      authorId: updatedItem.authorId
    };

    console.log('Post updated successfully:', { postId, tenantId, version: updatedPost.version });

    return formatResponse(200, updatedPost);

  } catch (error) {
    console.error('Update post error:', error);

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
