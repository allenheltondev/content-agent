# Implementation Plan

- [x] 1. Create Lambda function for post status updates





  - Create `functions/api/update-post-status.mjs` with handler that accepts POST requests
  - Implement DynamoDB operations to update post status and timestamp
  - Add input validation for status field with allowed values "Draft" and "Complete"
  - Include tenant isolation and post existence validation
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4_

- [x] 2. Add API Gateway configuration





  - Update `template.yaml` to define UpdatePostStatusFunction resource
  - Configure Lambda function with DynamoDB permissions and environment variables
  - Add API Gateway event mapping for POST /posts/{postId}/statuses endpoint
  - _Requirements: 1.1, 4.1_

- [x] 3. Update OpenAPI specification





  - Add POST /posts/{postId}/statuses endpoint definition to `openapi.yaml`
  - Define request schema with status property and enum values
  - Add response definitions for 204, 400, and 404 status codes
  - Include API Gateway integration configuration
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 4. Implement frontend API service method





  - Add `updatePostStatus` method to existing API service class
  - Include proper error handling and TypeScript types
  - Use existing authentication patterns with JWT token
  - _Requirements: 2.1, 2.3_

- [x] 5. Add Finalize Draft button functionality





  - Locate and update the component containing the Finalize Draft button
  - Implement click handler that calls the new API endpoint
  - Add loading state management during API call
  - Update local post state when status update succeeds
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 6. Implement editor read-only behavior





  - Update editor components to check post status for read-only mode
  - Disable editing controls when post status is "Complete"
  - Hide suggestions display in Review tab for Complete posts
  - Ensure only Review tab is enabled for Complete posts
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
