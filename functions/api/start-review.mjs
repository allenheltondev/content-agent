import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { AuthClient, CredentialProvider, ExpiresIn, TopicRole } from '@gomomento/sdk';
import { formatResponse } from '../utils/responses.mjs';
import { incrementMajorVersion } from '../utils/versioning.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const authClient = new AuthClient({ credentialProvider: CredentialProvider.fromEnvironmentVariable('MOMENTO_AUTH_TOKEN') });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;
    const { postId } = event.pathParameters;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

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

    const post = unmarshall(getResponse.Item);

    // Increment major version when starting a review
    const newVersion = incrementMajorVersion(post.version);

    // Update the post with the new major version
    const updateResponse = await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      }),
      UpdateExpression: 'SET version = :newVersion, updatedAt = :updatedAt',
      ExpressionAttributeValues: marshall({
        ':newVersion': newVersion,
        ':updatedAt': Date.now()
      }),
      ReturnValues: 'ALL_NEW'
    }));

    const updatedPost = unmarshall(updateResponse.Attributes);
    const topicName = `${tenantId}_${postId}`;
    let momentoToken;

    try {
      const tokenResponse = await authClient.generateDisposableToken({
        permissions: [{
          role: TopicRole.SubscribeOnly,
          cache: process.env.MOMENTO_CACHE_NAME,
          topic: topicName
        }]
      },
        ExpiresIn.minutes(10)
      );

      momentoToken = tokenResponse.authToken;
    } catch (momentoError) {
      console.error('Failed to generate Momento token:', momentoError);
      return formatResponse(500, { error: 'Failed to generate auth token' });
    }

    try {
      const eventDetail = {
        tenantId,
        contentId: postId,
        version: updatedPost.version
      };

      await eventBridge.send(new PutEventsCommand({
        Entries: [{
          Source: 'content-agent',
          DetailType: 'Start Content Analysis',
          Detail: JSON.stringify(eventDetail),
        }]
      }));

    } catch (eventError) {
      console.error('Failed to publish EventBridge event:', eventError);
      return formatResponse(500, { error: 'Failed to start review process' });
    }

    const response = {
      reviewId: postId,
      token: momentoToken,
      endpoint: `${process.env.SUBSCRIBE_BASE_URL}/topics/${process.env.MOMENTO_CACHE_NAME}/${topicName}`,
      expiresAt: Math.floor(Date.now() / 1000) + (10 * 60) // 10 minutes from now
    };

    return formatResponse(200, response);

  } catch (error) {
    console.error('Start review error:', error);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
