/**
 * Pre-token generation Lambda trigger for Cognito User Pool
 * Injects tenantId as a custom claim into JWT tokens
 */
export const handler = async (event) => {
  console.log('Pre-token generation trigger event:', JSON.stringify(event, null, 2));

  try {
    const { request } = event;
    const userAttributes = request.userAttributes;

    // Extract tenantId from user's custom attributes, or use sub as fallback
    let tenantId = userAttributes['tenantId'];

    // If no tenantId exists, use the user's sub as tenantId (single-tenant approach)
    if (!tenantId) {
      tenantId = userAttributes.sub;
      console.log(`No tenantId found for user ${userAttributes.sub}, using sub as tenantId`);
    }

    // Initialize claimsOverrideDetails if it doesn't exist
    if (!event.response.claimsOverrideDetails) {
      event.response.claimsOverrideDetails = {};
    }

    // Initialize claimsToAddOrOverride if it doesn't exist
    if (!event.response.claimsOverrideDetails.claimsToAddOrOverride) {
      event.response.claimsOverrideDetails.claimsToAddOrOverride = {};
    }

    // Add tenantId as a custom claim
    event.response.claimsOverrideDetails.claimsToAddOrOverride.tenantId = tenantId;

    console.log(`Added tenantId ${tenantId} to JWT token for user ${request.userAttributes.sub}`);

    return event;
  } catch (error) {
    console.error('Error in pre-token generation trigger:', error);
    throw error;
  }
};
