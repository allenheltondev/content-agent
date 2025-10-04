# Implementation Plan

- [x] 1. Implement GetProfileFunction Lambda





  - Create functions/api/get-profile.mjs with handler that extracts tenantId from JWT context
  - Add DynamoDB GetItem operation using simplified pk structure (tenantId#profile)
  - Transform DynamoDB item to UserProfile response format inline
  - Add proper error handling for profile not found (404) and server errors (500)
  - Use existing formatResponse utility for consistent response formatting
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3_

- [x] 2. Implement CreateProfileFunction Lambda





  - Create functions/api/create-profile.mjs with simple JSON parsing (API Gateway handles validation)
  - Extract tenantId and userId from JWT context for profile creation
  - Add user info extraction from Cognito (email, name) for complete profile data
  - Implement DynamoDB PutItem with condition to prevent duplicate profiles
  - Transform and return created profile data inline using existing formatResponse utility
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 4.3, 5.1, 5.5_

- [x] 3. Implement UpdateProfileFunction Lambda





  - Create functions/api/update-profile.mjs with simple JSON parsing (API Gateway handles validation)
  - Build dynamic UpdateExpression inline for only provided fields
  - Implement version increment and updatedAt timestamp update logic
  - Add condition check to ensure profile exists before updating (404 if not found)
  - Return updated profile data with new version and timestamp using existing formatResponse utility
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 5.2, 5.6_

- [x] 4. Add profile endpoints to OpenAPI specification





  - Update openapi.yaml with GET /profile endpoint definition and UserProfile schema
  - Add POST /profile endpoint with CreateProfileRequest schema, validation, and 201 response
  - Add PUT /profile endpoint with UpdateProfileRequest schema, validation, and 200 response
  - Include all error response definitions (400, 401, 404, 409, 500) for profile endpoints
  - Configure request validation at API Gateway level for all profile endpoints
  - _Requirements: 6.6_

- [x] 5. Configure Lambda functions in SAM template






  - Add GetProfileFunction resource with proper IAM permissions for DynamoDB GetItem
  - Add CreateProfileFunction resource with DynamoDB PutItem permissions
  - Add UpdateProfileFunction resource with DynamoDB UpdateItem permissions
  - Configure API Gateway events for all three profile endpoints with Lambda authorizer
  - _Requirements: 4.1, 6.1, 6.2, 6.3, 6.6_

- [x] 6. Wire up API Gateway integration





  - Connect GET /profile route to GetProfileFunction in SAM template
  - Connect POST /profile route to CreateProfileFunction with 201 status mapping
  - Connect PUT /profile route to UpdateProfileFunction
  - Verify CORS configuration includes profile endpoints
  - _Requirements: 6.6_

- [ ]* 7. Create unit tests for profile Lambda functions
  - Test DynamoDB operations with mocked AWS SDK calls
  - Test error handling scenarios (not found, duplicate creation, server errors)
  - Test inline data transformation logic
  - Test dynamic update expression building logic
  - _Requirements: 1.6, 2.5, 3.7_

- [ ]* 8. Add integration tests for profile API endpoints
  - Test complete GET /profile request/response cycle with authentication
  - Test POST /profile creation flow with proper JWT token handling
  - Test PUT /profile update flow with partial updates
  - Verify tenant isolation and proper error responses
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
