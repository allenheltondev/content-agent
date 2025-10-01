import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  console.log('List posts event:', JSON.stringify(event, null, 2));

  try {
    // Extract tenantId from authorizer context
    const { tenantId, userId } = event.requestContext.authorizer;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    console.log('Querying posts for tenant:', tenantId);

    // Query DynamoDB using GSI1 with tenantId scope
    const response = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :tenantId AND begins_with(GSI1SK, :contentPrefix)',
      ExpressionAttributeValues: {
        ':tenantId': { S: tenantId },
        ':contentPrefix': { S: 'content#' }
      },
      ScanIndexForward: false // Sort by timestamp descending (newest first)
    }));

    // Transform DynamoDB items to blog post format
    const posts = response.Items?.map(item => {
      const unmarshalled = unmarshall(item);
      return {
        id: unmarshalled.contentId,
        title: unmarshalled.title || '',
        body: unmarshalled.body || '',
        status: unmarshalled.status || 'draft',
        version: unmarshalled.version || 1,
        createdAt: unmarshalled.createdAt,
        updatedAt: unmarshalled.updatedAt,
        authorId: unmarshalled.authorId
      };
    }) || [];

    console.log(`Found ${posts.length} posts for tenant ${tenantId}`);

    return formatResponse(200, posts);

  } catch (error) {
    console.error('List posts error:', error);

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
