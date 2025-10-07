# Implementation Plan

- [x] 1. Create delete-post-async Lambda function





  - Create new Lambda function `functions/api/delete-post-async.mjs` for async cleanup operations
  - Add DynamoDB query operations for suggestions and audit reports using correct key patterns
  - Implement batch delete operations with proper error handling and retry logic
  - Add comprehensive logging for cleanup operations and results
  - _Requirements: 1.2, 1.3, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

- [x] 2. Enhance delete-post function to invoke async cleanup






  - Modify existing delete-post handler to invoke the delete-post-async Lambda after successful post deletion
  - Use Lambda async invocation to ensure cleanup runs without blocking the API response
  - Maintain existing immediate post deletion and statistics update logic
  - Add error handling to prevent async invocation failures from affecting user response
  - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 4.1, 4.2_

- [x] 3. Implement efficient DynamoDB query patterns





  - Create query functions for finding all suggestions using partition key and sort key prefix
  - Create query functions for finding all audit reports using partition key and sort key prefix
  - Implement pagination handling for large result sets
  - Add tenant validation to ensure only tenant-owned data is queried
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.4_

- [x] 4. Add batch deletion operations





  - Implement batch write operations for efficient deletion of multiple items
  - Handle DynamoDB batch size limits (25 items per batch)
  - Add retry logic for failed batch operations with exponential backoff
  - Implement individual item deletion fallback for persistent batch failures
  - _Requirements: 2.3, 2.4, 3.4_

- [ ] 5. Enhance logging and monitoring
  - Add structured logging for all cleanup operations with consistent fields
  - Log success metrics including counts of deleted suggestions and audit reports
  - Implement error logging with sufficient context for debugging
  - Add performance logging to track cleanup operation duration
  - _Requirements: 2.5, 3.4, 4.5_

- [ ]* 6. Create comprehensive unit tests
  - Write unit tests for async cleanup utility function
  - Test DynamoDB query construction and execution
  - Test batch deletion logic and error handling scenarios
  - Test tenant isolation and security validation
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.4_

- [ ]* 7. Add integration tests for end-to-end cleanup
  - Create test data setup with posts, suggestions, and audit reports
  - Test complete cleanup workflow from API call to data removal
  - Verify tenant statistics are correctly updated
  - Test error scenarios and partial cleanup handling
  - _Requirements: 1.1, 1.2, 1.3, 4.2, 4.3_
