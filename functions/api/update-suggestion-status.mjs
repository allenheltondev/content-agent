import { DynamoDBClient, GetItemCommand, DeleteItemCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, formatEmptyResponse } from '../utils/responses.mjs';
import { updateSuggestionStatus as updateStatistics } from '../utils/tenant-statistics.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { postId, suggestionId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('Invalid JSON in request body:', error);
      return formatResponse(400, { error: 'Invalid JSON in request body' });
    }

    const { status } = requestBody;
    const suggestionKey = {
      pk: `${tenantId}#${postId}`,
      sk: `suggestion#${suggestionId}`
    };

    const getResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall(suggestionKey)
    }));

    if (!getResponse.Item) {
      console.warn('Suggestion not found or access denied:', { tenantId, postId, suggestionId });
      return formatResponse(404, { error: 'Suggestion not found' });
    }

    const suggestion = unmarshall(getResponse.Item);
    const currentStatus = suggestion.status || 'pending';

    if (currentStatus === status) {
      return formatEmptyResponse(204);
    }

    const suggestionType = suggestion.type || 'llm';

    if (status === 'deleted') {
      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall(suggestionKey),
        ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
      }));
    } else {
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall(suggestionKey),
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':status': status,
          ':updatedAt': new Date().toISOString()
        }),
        ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
      }));
    }

    try {
      await updateStatistics(tenantId, suggestionType, status, currentStatus);
    } catch (statsError) {
      console.error('Error updating statistics for suggestion status change:', statsError);
      // Don't fail the API response if statistics update fails
    }

    return formatEmptyResponse(204);
  } catch (error) {
    console.error('Update suggestion status error:', error);

    if (error.name === 'ConditionalCheckFailedException') {
      return formatResponse(404, { error: 'Suggestion not found' });
    }

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
