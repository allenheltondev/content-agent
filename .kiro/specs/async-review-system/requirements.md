# Requirements Document

## Introduction

This feature implements an asynchronous review system that allows users to trigger content analysis workflows and receive real-time notifications when the analysis is complete. The system uses EventBridge to start Step Function workflows and Momento for real-time messaging to provide a seamless user experience without blocking the UI.

## Requirements

### Requirement 1

**User Story:** As a content creator, I want to trigger an async review of my post content, so that I can continue working while the analysis runs in the background.

#### Acceptance Criteria

1. WHEN a user calls POST /posts/{id}/reviews THEN the system SHALL start the analyze-content Step Function workflow asynchronously
2. WHEN the workflow is triggered THEN the system SHALL publish a "Start Content Analysis" EventBridge message
3. WHEN the API call is made THEN the system SHALL return a Momento auth token scoped only to the tenantId#contentId topic
4. WHEN the token is returned THEN it SHALL have appropriate expiration and permissions for one-time subscription

### Requirement 2

**User Story:** As a content creator, I want to receive real-time notifications when my content analysis is complete, so that I know when to check the results.

#### Acceptance Criteria

1. WHEN the content analysis workflow completes THEN the system SHALL publish a completion message to the Momento topic
2. WHEN the UI receives the completion message THEN it SHALL display an animated notification sliding down from the top
3. WHEN the notification appears THEN it SHALL include a refresh icon and "review is complete" message
4. WHEN the user clicks the refresh icon THEN the system SHALL call GET /posts/{id}/suggestions and render the results
5. WHEN the analysis is in progress THEN the UI SHALL display a loading indicator telling the user to wait

### Requirement 3

**User Story:** As a content creator, I want the UI to automatically listen for completion notifications, so that I don't have to manually check if my analysis is done.

#### Acceptance Criteria

1. WHEN the POST /posts/{id}/reviews endpoint is called THEN the UI SHALL use the returned Momento token to subscribe to the topic
2. WHEN subscribing THEN the UI SHALL use HTTP long polling on the Momento topic endpoint
3. WHEN a message is received THEN the UI SHALL process it one time and stop listening
4. WHEN the notification is dismissed THEN the UI SHALL refresh the suggestions data automatically

### Requirement 4

**User Story:** As a system administrator, I want the async review system to be secure and properly scoped, so that users can only receive notifications for their own content.

#### Acceptance Criteria

1. WHEN generating Momento tokens THEN the system SHALL scope them to tenantId#contentId topic only
2. WHEN a user requests a review THEN the system SHALL validate they have access to the specified post
3. WHEN publishing messages THEN the system SHALL ensure proper tenant isolation
4. WHEN tokens expire THEN the system SHALL handle graceful degradation without errors

### Requirement 5

**User Story:** As a developer, I want the system to handle errors gracefully, so that failed async operations don't break the user experience.

#### Acceptance Criteria

1. WHEN the Step Function workflow fails THEN the system SHALL publish an error message to the Momento topic
2. WHEN the UI receives an error message THEN it SHALL display an error notification with a retry button
3. WHEN the user clicks retry THEN the system SHALL call POST /posts/{id}/reviews again to restart the process
4. WHEN network errors occur during long polling THEN the UI SHALL display appropriate error messages with retry options
5. WHEN tokens expire during polling THEN the UI SHALL handle the expiration gracefully
6. WHEN EventBridge publishing fails THEN the system SHALL return appropriate error responses
7. WHEN Momento is unavailable THEN the system SHALL provide fallback behavior
