import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/responses.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      console.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: tenantId,
        sk: 'profile'
      })
    }));

    if (!response.Item) {
      console.log('Profile not found for tenant:', tenantId);
      return formatResponse(404, { error: 'Profile not found' });
    }

    const profileData = unmarshall(response.Item);
    const userProfile = {
      id: profileData.tenantId,
      writingTone: profileData.writingTone,
      writingStyle: profileData.writingStyle,
      topics: profileData.topics || [],
      skillLevel: profileData.skillLevel,
      isComplete: profileData.isComplete,
      createdAt: profileData.createdAt,
      updatedAt: profileData.updatedAt
    };

    return formatResponse(200, { profile: userProfile });

  } catch (error) {
    console.error('Get profile error:', error);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
