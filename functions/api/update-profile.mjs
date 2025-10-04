import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { formatEmptyResponse, formatResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId ) {
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

    const updateExpression = buildUpdateExpression(requestBody);

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'profile'
      }),
      UpdateExpression: updateExpression.expression,
      ExpressionAttributeValues: marshall(updateExpression.values),
      ExpressionAttributeNames: updateExpression.names,
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }));


    return formatEmptyResponse(204);
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.name === 'ConditionalCheckFailedException') {
      return formatResponse(404, { error: 'Profile not found' });
    }

    return formatResponse(500, { message: 'Something went wrong' });
  }
};

const buildUpdateExpression = (updateData) => {
  const setExpressions = [];
  const values = {};
  const names = {};

  Object.entries(updateData).forEach(([key, value]) => {
    const attrName = `#${key}`;
    const attrValue = `:${key}`;

    names[attrName] = key;
    values[attrValue] = value;
    setExpressions.push(`${attrName} = ${attrValue}`);
  });

  setExpressions.push('#updatedAt = :now');

  names['#updatedAt'] = 'updatedAt';
  values[':inc'] = 1;
  values[':now'] = Date.now();

  return {
    expression: `SET ${setExpressions.join(', ')}`,
    values,
    names
  };
};
