import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  console.log('Get post event:', JSON.stringify(event, null, 2));

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

    console.log('Getting post:', { tenantId, postId });

    // Verify post belongs to user's tenant using composite key
    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      })
    }));

    if (!response.Item) {
      console.log('Post not found:', { tenantId, postId });
      return formatResponse(404, { error: 'Post not found' });
    }

    // Transform DynamoDB item to blog post format
    const item = unmarshall(response.Item);
    const post = {
      id: item.contentId,
      title: item.title || '',
      body: item.body || '',
      status: item.status || 'draft',
      version: item.version || 1,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      authorId: item.authorId
    };

    console.log('Post retrieved successfully:', { postId, tenantId });

    return formatResponse(200, post);

  } catch (error) {
    console.error('Get post error:', error);

    return formatResponse(500, { message: 'Something went wrong' });
  }
};
