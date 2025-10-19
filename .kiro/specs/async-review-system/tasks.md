# Implementation Plan

- [x] 1. Create POST /posts/{id}/reviews API endpoint




  - Implement the main review trigger endpoint with EventBridge integration and direct Momento token generation
  - Include post validation and return scoped auth token
  - _Requirements: 1.1, 1.2, 1.3, 4.2_

- [x] 1.1 Implement start-review Lambda function


  - Write `functions/api/start-review.mjs` with post validation, EventBridge publishing, and direct Momento auth client usage
  - Generate and return Momento auth token with proper scoping using @gomomento/sdk directly
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 Add API Gateway configuration for review endpoint


  - Update `openapi.yaml` with POST /posts/{id}/reviews endpoint definition
  - Include proper request/response schemas and security
  - _Requirements: 1.1_

- [x] 1.3 Update SAM template for review endpoint


  - Add StartReviewFunction to `template.yaml` with proper permissions
  - Include EventBridge permissions (no special Momento permissions needed)
  - _Requirements: 1.1, 1.2_

- [ ] 2. Update Step Function workflow for Momento integration
  - Modify existing workflow to publish completion messages to Momento using direct SDK calls
  - Handle both success and failure scenarios
  - _Requirements: 2.1, 5.1_

- [ ] 2.1 Update analyze-content workflow definition
  - Modify `workflows/analyze-content.asl.json` to include Momento message publishing Lambda calls
  - Add success and failure message publishing steps
  - _Requirements: 2.1, 5.1_

- [ ] 2.2 Create Momento publisher Lambda for Step Functions
  - Write `functions/utils/momento-step-publisher.mjs` using @gomomento/sdk directly
  - Handle message publishing from workflow context with proper error handling
  - _Requirements: 2.1, 5.1_

- [x] 3. Implement frontend review service and UI components





  - Create service for managing async reviews and Momento polling
  - Implement notification UI components with animations
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3_

- [x] 3.1 Create review service for API integration


  - Write `blog-editor-ui/src/services/review-service.ts` for review API calls
  - Implement Momento HTTP polling with proper error handling
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3.2 Implement notification component


  - Create animated notification component that slides down from top
  - Include refresh icon and proper styling
  - _Requirements: 2.2, 2.3_

- [x] 3.3 Add review trigger and notification integration to post editor


  - Integrate review service into existing post editor component
  - Handle loading states and error scenarios with retry functionality
  - _Requirements: 2.4, 2.5, 5.2, 5.3_

- [x] 3.4 Update TypeScript types for review system


  - Add review-related types to `blog-editor-ui/src/types/index.ts`
  - Include API response types and notification interfaces
  - _Requirements: 1.3, 2.1_

- [ ]* 4. Add comprehensive error handling and retry logic
  - Implement robust error handling across all components
  - Add retry mechanisms for failed operations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ]* 4.1 Add backend error handling improvements
  - Enhance error handling in all Lambda functions
  - Add proper logging and monitoring
  - _Requirements: 5.4, 5.6, 5.7_

- [ ]* 4.2 Add frontend error recovery mechanisms
  - Implement retry logic for network failures
  - Add graceful handling of token expiration
  - _Requirements: 5.2, 5.3, 5.5_

- [ ] 5. Integration and end-to-end testing
  - Test complete async review flow from trigger to notification
  - Verify error scenarios and retry functionality
  - _Requirements: All requirements_

- [ ] 5.1 Test happy path review flow
  - Verify review trigger, workflow execution, and notification delivery
  - Test automatic suggestions refresh after completion
  - _Requirements: 1.1, 1.2, 2.1, 2.4, 3.3_

- [ ] 5.2 Test error scenarios and recovery
  - Test Step Function failures and error message delivery
  - Verify retry functionality and user feedback
  - _Requirements: 5.1, 5.2, 5.3_
