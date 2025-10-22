import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';
import { getInitialVersion } from '../utils/versioning.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { postId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }
    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      })
    }));

    if (!response.Item) {
      console.warn('Post not found:', { tenantId, postId });
      return formatResponse(404, { error: 'Post not found' });
    }

    const item = unmarshall(response.Item);
    const post = {
      id: item.contentId,
      title: item.title || '',
      body: item.body || '',
      status: item.status || 'draft',
      version: item.version || getInitialVersion(),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };

    return formatResponse(200, post);

  } catch (error) {
    console.error('Get post error:', error);

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
