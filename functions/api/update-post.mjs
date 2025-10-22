import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';
import { incrementMinorVersion } from '../utils/versioning.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { postId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }
    const updateData = JSON.parse(event.body || '{}');

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

    const currentPost = unmarshall(getResponse.Item);

    const bodyChanged = updateData.body !== undefined && updateData.body !== currentPost.body;
    const statusChanged = updateData.status !== undefined && updateData.status !== currentPost.status;

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

    if (bodyChanged) {
      const newVersion = incrementMinorVersion(currentPost.version);
      updateExpressions.push('#version = :newVersion');
      expressionAttributeNames['#version'] = 'version';
      expressionAttributeValues[':newVersion'] = { S: newVersion };
    }

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = { N: Date.now().toString() };

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

    const updatedItem = unmarshall(updateResponse.Attributes);

    // Transform the DynamoDB item to match the BlogPost interface
    const blogPost = {
      id: updatedItem.contentId,
      title: updatedItem.title,
      body: updatedItem.body,
      status: updatedItem.status,
      version: updatedItem.version,
      createdAt: updatedItem.createdAt,
      updatedAt: updatedItem.updatedAt,
      authorId: updatedItem.tenantId
    };

    try {
      await eventBridge.send(new PutEventsCommand({
        Entries: [{
          Source: 'content-agent',
          DetailType: 'Post Updated',
          Detail: JSON.stringify({
            tenantId,
            postId,
            version: updatedItem.version,
            bodyChanged,
            statusChanged,
            newStatus: updatedItem.status
          })
        }]
      }));

      console.log('EventBridge event published for post update');
    } catch (eventError) {
      // Log error but don't fail the API response
      console.error('Failed to publish EventBridge event:', eventError);
    }

    return formatResponse(200, blogPost);

  } catch (error) {
    console.error('Update post error:', error);

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
