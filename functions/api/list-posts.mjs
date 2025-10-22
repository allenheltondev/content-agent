import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';
import { getInitialVersion } from '../utils/versioning.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :tenantId AND begins_with(GSI1SK, :contentPrefix)',
      ExpressionAttributeValues: {
        ':tenantId': { S: tenantId },
        ':contentPrefix': { S: 'content#' }
      },
      ScanIndexForward: false
    }));

    const posts = response.Items?.map(item => {
      const unmarshalled = unmarshall(item);
      return {
        id: unmarshalled.pk.split('#')[1],
        title: unmarshalled.title || '',
        status: unmarshalled.status || 'draft',
        version: unmarshalled.version || getInitialVersion(),
        createdAt: unmarshalled.createdAt,
        updatedAt: unmarshalled.updatedAt,
      };
    }) || [];

    return formatResponse(200, { posts });

  } catch (error) {
    console.error('List posts error:', error);

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
