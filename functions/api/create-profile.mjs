import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';

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

    const { writingTone, writingStyle, topics, skillLevel } = requestBody;
    const now = Date.now();

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall({
        pk: tenantId,
        sk: 'profile',
        tenantId,
        writingTone,
        writingStyle,
        topics,
        skillLevel,
        isComplete: true,
        createdAt: now,
        updatedAt: now
      }),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }));

    return formatResponse(201, { id: tenantId });

  } catch (error) {
    console.error('Create profile error:', error);
    if (error.name === 'ConditionalCheckFailedException') {
      return formatResponse(409, { error: 'Profile already exists for this user' });
    }

    return formatResponse(500, { message: 'Something went wrong' });
  }
};

