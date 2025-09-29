# Implementation Plan

- [ ] 1. Set up Cognito User Pool with custom attributes and Lambda triggers
  - Create Cognito User Pool with custom tenantId attribute in SAM template
  - Configure user pool settings for email verification and password policy
  - Define Lambda triggers for post-confirmation and pre-token generation
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [ ] 2. Implement post-confirmation Lambda trigger for tenant ID generation
  - Create functions/auth/post-confirmation.mjs following existing folder structure
  - Generate unique tenantId using UUID v4 when new users confirm registration
  - Update user's custom attributes in Cognito with the generated tenantId
  - Add proper error handling and logging following existing patterns
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 3. Implement pre-token generation Lambda trigger for JWT customization
  - Create functions/auth/pre-token-generation.mjs following existing folder structure
  - Extract tenantId from user's custom attributes
  - Inject tenantId as custom claim into JWT tokens
  - Handle cases where tenantId might be missing with appropriate fallbacks
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. Create Lambda authorizer for JWT validation and context injection
  - Create functions/auth/authorizer.mjs following existing folder structure
  - Validate JWT tokens against Cognito public keys
  - Extract tenantId and userId from validated tokens
  - Return IAM policy with tenant context for API Gateway
  - Add comprehensive error handling for invalid tokens
  - _Requirements: 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 8.2, 8.3, 8.4_

- [ ] 5. Create OpenAPI specification file for the blog API
  - Create api-spec.yaml file with complete OpenAPI 3.0 specification
  - Define all blog post endpoints with AWS API Gateway extensions
  - Include suggestion endpoints with proper parameter definitions
  - Add comprehensive schema definitions for BlogPost and Suggestion models
  - Configure x-amazon-apigateway-integration for each endpoint
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 6. Implement blog posts CRUD Lambda functions
- [ ] 6.1 Create list posts function
  - Create functions/api/list-posts.mjs following existing patterns
  - Extract tenantId from authorizer context
  - Query DynamoDB using GSI1 with tenantId scope
  - Return array of blog posts with proper error handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 6.2 Create get post function
  - Create functions/api/get-post.mjs following existing patterns
  - Extract tenantId and postId from context and path parameters
  - Verify post belongs to user's tenant using composite key
  - Return single blog post or appropriate error responses
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 6.3 Create create post function
  - Create functions/api/create-post.mjs following existing patterns
  - Extract tenantId from authorizer context
  - Generate unique contentId and validate request body using Zod
  - Store new post in DynamoDB with proper key structure
  - Return created post with timestamps and metadata
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 6.4 Create update post function
  - Create functions/api/update-post.mjs following existing patterns
  - Extract tenantId and postId from context and path parameters
  - Verify post ownership and validate update payload
  - Update post in DynamoDB and increment version number
  - Return updated post with new timestamp
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.5 Create delete post function
  - Create functions/api/delete-post.mjs following existing patterns
  - Extract tenantId and postId from context and path parameters
  - Verify post ownership before deletion
  - Remove post from DynamoDB using composite key
  - Return 204 status code on successful deletion
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7. Implement suggestions API Lambda functions
- [ ] 7.1 Create get suggestions function
  - Create functions/api/get-suggestions.mjs following existing patterns
  - Extract tenantId and postId from context and path parameters
  - Verify post ownership and query suggestions using composite key pattern
  - Return array of suggestions for the specified post
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 7.2 Create delete suggestion function
  - Create functions/api/delete-suggestion.mjs following existing patterns
  - Extract tenantId and suggestionId from context and path parameters
  - Verify suggestion belongs to user's tenant through post ownership
  - Remove suggestion from DynamoDB using composite key
  - Return 204 status code on successful deletion
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 8. Update SAM template with all new resources
  - Add Cognito User Pool resource with custom attributes configuration
  - Add Lambda authorizer resource with proper IAM permissions
  - Add all blog API Lambda functions with consistent configuration
  - Add API Gateway resource using OpenAPI specification file
  - Configure Lambda triggers for Cognito User Pool
  - Add necessary IAM policies for DynamoDB access and Cognito operations
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 9. Wire up API Gateway with Lambda functions and authorizer
  - Configure API Gateway to use Lambda authorizer for all protected endpoints
  - Set up proper CORS configuration for frontend integration
  - Configure stage deployment with name 'api'
  - Test API Gateway integration with Lambda functions
  - Verify authorizer context is properly passed to Lambda functions
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_
