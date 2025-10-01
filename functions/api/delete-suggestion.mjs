import { DynamoDBClient, GetItemCommand, DeleteItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, formatEmptyResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  console.log('Delete suggestion event:', JSON.stringify(event, null, 2));

  try {
    // Extract tenantId from authorizer context
    const { tenantId, userId } = event.requestContext.authorizer;

    // Extract suggestionId from path parameters
    const suggestionId = event.pathParameters?.id;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    if (!suggestionId) {
      console.error('Missing suggestionId in path parameters');
      return formatResponse(400, { error: 'Missing suggestion ID' });
    }

    console.log('Deleting suggestion:', { tenantId, suggestionId });

    // First, find the suggestion to get the contentId and verify tenant ownership
    // We need to query across all posts in the tenant to find the suggestion
    const queryResponse = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :tenantId AND begins_with(GSI1SK, :suggestionPrefix)',
      FilterExpression: 'suggestionId = :suggestionId',
      ExpressionAttributeValues: {
        ':tenantId': { S: tenantId },
        ':suggestionPrefix': { S: 'suggestion#' },
        ':suggestionId': { S: suggestionId }
      }
    }));

    if (!queryResponse.Items || queryResponse.Items.length === 0) {
      console.log('Suggestion not found or access denied:', { tenantId, suggestionId });
      return formatResponse(403, { error: 'Access denied' });
    }

    const suggestionItem = unmarshall(queryResponse.Items[0]);
    const contentId = suggestionItem.contentId;

    console.log('Suggestion found, proceeding with deletion:', {
      suggestionId,
      contentId,
      tenantId
    });

    // Remove suggestion from DynamoDB using composite key
    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${contentId}`,
        sk: `suggestion#${suggestionId}`
      }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }));

    console.log('Suggestion deleted successfully:', { suggestionId, contentId, tenantId });

    // Return 204 status code on successful deletion
    return formatEmptyResponse();

  } catch (error) {
    console.error('Delete suggestion error:', error);

    // Handle conditional check failed (suggestion doesn't exist)
    if (error.name === 'ConditionalCheckFailedException') {
      return formatResponse(404, { error: 'Suggestion not found' });
    }

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
