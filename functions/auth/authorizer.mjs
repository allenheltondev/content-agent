import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';

let verifier;
const cognito = new CognitoIdentityProviderClient();

export const handler = async (event) => {
  console.log('Authorizer event:', JSON.stringify(event, null, 2));

  try {
    const authorizationToken = event.headers?.Authorization || event.headers?.authorization;

    if (!authorizationToken) {
      throw new Error('No Authorization header provided');
    }

    // Extract token from Bearer format
    const tokenMatch = authorizationToken.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      console.error('Invalid authorization token format');
      throw new Error('Unauthorized');
    }

    const token = tokenMatch[1];

    // Create verifier if not already created (lazy initialization)
    if (!verifier) {
      verifier = CognitoJwtVerifier.create({
        userPoolId: process.env.USER_POOL_ID,
        tokenUse: 'access',
        clientId: process.env.USER_POOL_CLIENT_ID,
      });
    }

    // Verify JWT token
    const decoded = await verifier.verify(token);

    console.log('JWT decoded successfully:', {
      sub: decoded.sub,
      exp: decoded.exp,
    });

    // Get user attributes directly from Cognito (more secure than trusting token claims)
    const userInfo = await getUserAttributes(token);
    console.log(userInfo);
    // Extract required claims
    const userId = userInfo.sub || decoded.sub;
    const tenantId = userInfo['custom:tenantId'] || null;
    const email = userInfo.email;

    // Validate required claims
    if (!userId) {
      console.error('Missing userId (sub) in user attributes');
      throw new Error('Unauthorized');
    }

    if (!tenantId) {
      console.error('Missing tenantId in user attributes');
      throw new Error('Unauthorized');
    }

    // Generate allow policy with context
    const apiArn = getApiArnPattern(event.methodArn);
    const policy = generatePolicy(userId, 'Allow', apiArn, {
      tenantId,
      userId,
      email: email || '',
    });

    console.log('Authorization successful for user:', {
      userId,
      tenantId,
      email,
    });

    return policy;
  } catch (error) {
    console.error('Authorization failed:', error.message);

    throw new Error('Unauthorized');
  }
};

const getUserAttributes = async (accessToken) => {
  try {
    const command = new GetUserCommand({ AccessToken: accessToken });
    const response = await cognito.send(command);

    const attrs = {};
    for (const attr of response.UserAttributes) {
      attrs[attr.Name] = attr.Value;
    }

    return attrs;
  } catch (err) {
    console.error("Error fetching user attributes:", err);
    throw new Error('Failed to fetch user attributes');
  }
};

const getApiArnPattern = (methodArn) => {
  // Extract the API Gateway ARN base and create a wildcard policy
  // Format: arn:aws:execute-api:region:account:api-id/stage/METHOD/resource-path
  // We want: arn:aws:execute-api:region:account:api-id/stage/*/*
  const arnParts = methodArn.split('/');
  return arnParts.slice(0, 2).join('/') + '/*/*';
};

const generatePolicy = (principalId, effect, resource, context = {}) => {
  const authResponse = {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    },
    context,
  };

  console.log('Generated policy:', JSON.stringify(authResponse, null, 2));
  return authResponse;
};
