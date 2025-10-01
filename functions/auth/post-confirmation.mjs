import { CognitoIdentityProviderClient, AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { randomUUID } from 'crypto';

const cognitoClient = new CognitoIdentityProviderClient();

/**
 * Post-confirmation Lambda trigger for Cognito User Pool
 * Generates a unique tenantId for new users and stores it as a custom attribute
 */
export const handler = async (event) => {
  console.log('Post-confirmation trigger event:', JSON.stringify(event, null, 2));

  try {
    const { userPoolId, userName } = event;

    // Generate unique tenant ID using UUID v4
    const tenantId = randomUUID();

    // Update user attributes with the generated tenantId
    const updateCommand = new AdminUpdateUserAttributesCommand({
      UserPoolId: userPoolId,
      Username: userName,
      UserAttributes: [
        {
          Name: 'custom:tenantId',
          Value: tenantId
        }
      ]
    });

    await cognitoClient.send(updateCommand);

    console.log(`Generated tenantId ${tenantId} for user ${userName}`);

    // Return the event unchanged (required for Cognito triggers)
    return event;
  } catch (error) {
    console.error('Error in post-confirmation trigger:', error);
    throw error;
  }
};
