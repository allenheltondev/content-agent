# Implementation Plan

- [ ] 1. Update API schemas and validation
  - Update Zod schemas in update-post.mjs to remove "finalized" status and only allow "draft", "review", "published", "abandoned"
  - Update create-post.mjs schema to match the consolidated status values
  - Update OpenAPI specification to reflect the new status enum values
  - _Requirements: 8.3_

- [ ] 2. Enhance update-post function with intelligent version management
  - [ ] 2.1 Implement version increment logic based on body content changes
    - Add logic to compare current body with new body content
    - Only increment version when body content actually changes
    - Always update updatedAt timestamp regardless of version increment
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ] 2.2 Add EventBridge event publishing for background processing
    - Import EventBridge client and configure event publishing
    - Create event structure with tenantId, postId, version, bodyChanged, statusChanged, newStatus
    - Publish event after successful database update
    - Handle EventBridge publishing errors gracefully without failing the API response
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ] 2.3 Change API response to return 204 status with empty body
    - Modify successful response to return 204 No Content instead of 200 with post data
    - Ensure error responses still return appropriate status codes and error messages
    - _Requirements: 2.3_

- [ ] 3. Create post processing Lambda function
  - [ ] 3.1 Set up new Lambda function infrastructure
    - Add PostProcessingFunction to template.yaml with appropriate permissions
    - Configure EventBridge trigger for "Post Updated" events
    - Set up DynamoDB permissions for reading posts and managing suggestions
    - _Requirements: 6.1, 6.2_

  - [ ] 3.2 Implement post content loading and suggestion validation
    - Load current post content from DynamoDB using tenantId and postId
    - Query all pending suggestions for the post
    - Implement anchor text and context matching logic to validate suggestion relevance
    - Mark suggestions as "skipped" when anchor text/context cannot be found in updated content
    - Update valid suggestions to current post version
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.3 Implement published status handling
    - Detect when newStatus is "published" from EventBridge event
    - Mark all remaining pending suggestions as "rejected" when post is published
    - Update suggestion records with new status and updatedAt timestamp
    - _Requirements: 3.4_

  - [ ] 3.4 Add error handling and logging for background processing
    - Implement try-catch blocks for all processing steps
    - Log detailed error information for debugging without affecting API responses
    - Continue processing other suggestions even if individual validations fail
    - _Requirements: 6.3, 8.4_

- [ ] 4. Create suggestion status management API
  - [ ] 4.1 Repurpose delete-suggestion function for status management
    - Change endpoint from DELETE /suggestions/{id} to POST /posts/{postId}/suggestions/{suggestionId}/statuses
    - Update route configuration in template.yaml and OpenAPI specification
    - Modify function to accept POST requests with status in request body
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 4.2 Implement status validation and processing logic
    - Add Zod schema validation for status values: "accepted", "rejected", "deleted"
    - Validate that suggestion belongs to specified post and tenant
    - For "deleted" status: permanently delete the suggestion record
    - For "accepted" and "rejected": update suggestion status and updatedAt timestamp
    - Return 204 No Content for all successful operations
    - _Requirements: 4.4, 4.5, 8.3_

- [ ] 5. Enhance get-suggestions API to filter by status
  - Add DynamoDB filter expression to only return suggestions with status "pending"
  - Update query to exclude suggestions with status "accepted", "rejected", "deleted", or "skipped"
  - Ensure backward compatibility by adding status field to suggestion records if not present
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6. Implement tenant statistics tracking
  - [ ] 6.1 Create tenant statistics data model and operations
    - Design DynamoDB record structure for tenant statistics with pk: "tenantId", sk: "stats"
    - Implement functions to increment counters for different suggestion types and outcomes
    - Create statistics record if it doesn't exist when first suggestion is processed
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 6.2 Integrate statistics updates into suggestion status changes
    - Update statistics when suggestions are created, accepted, rejected, deleted, or skipped
    - Call statistics update functions from both post processing Lambda and suggestion status API
    - Handle statistics update failures gracefully without blocking main operations
    - _Requirements: 5.1, 5.2_

- [ ] 7. Update infrastructure and configuration
  - [ ] 7.1 Add EventBridge permissions and configuration
    - Update UpdatePostFunction IAM permissions to allow EventBridge PutEvents
    - Configure EventBridge rule to trigger PostProcessingFunction
    - Add environment variables for EventBridge configuration
    - _Requirements: 6.1, 6.2_

  - [ ] 7.2 Update DynamoDB permissions for new operations
    - Add Query permissions for PostProcessingFunction to read suggestions
    - Add UpdateItem permissions for suggestion status updates
    - Add PutItem permissions for tenant statistics creation
    - _Requirements: 6.2_

- [ ]* 8. Add comprehensive testing
  - [ ]* 8.1 Write unit tests for version increment logic
    - Test scenarios where body changes vs metadata-only changes
    - Verify version increment behavior and timestamp updates
    - Test EventBridge event structure and content
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 8.2 Write integration tests for suggestion lifecycle
    - Test end-to-end flow: create suggestions → update post → verify suggestion status changes
    - Test anchor text validation logic with various content scenarios
    - Verify statistics updates across different suggestion outcomes
    - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2_

  - [ ]* 8.3 Write tests for API endpoints
    - Test suggestion status management API with various status values
    - Test get-suggestions filtering by pending status
    - Verify error handling and validation for all endpoints
    - _Requirements: 4.1, 4.2, 4.3, 7.1, 7.2, 8.1, 8.2, 8.3_
