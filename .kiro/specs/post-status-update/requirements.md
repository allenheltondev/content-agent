# Requirements Document

## Introduction

This feature implemeedicated endpoint for updating blog post status, specifically to support the "Finalize Draft" workflow where users can transition posts from "Draft" to "Complete" status. The system will provide a simple, focused API endpoint that handles status transitions and integrates with the frontend editor's read-only behavior for completed posts.

## Requirements

### Requirement 1: Post Status Update Endpoint

**User Story:** As a content creator, I want to update my post status through a dedicated endpoint, so that I can finalize my drafts and control the post lifecycle independently of content updates.

#### Acceptance Criteria

1. WHEN I call POST /posts/{id}/statuses with status "Draft" THEN the system SHALL update the post status to "Draft" and return 204 No Content
2. WHEN I call POST /posts/{id}/statuses with status "Complete" THEN the system SHALL update the post status to "Complete" and return 204 No Content
3. WHEN the endpoint receives an invalid status value THEN the system SHALL return 400 Bad Request with validation error details
4. WHEN the post ID does not exist or belongs to a different tenant THEN the system SHALL return 404 Not Found
5. WHEN the request body is malformed or missing the status property THEN the system SHALL return 400 Bad Request

### Requirement 2: Frontend Integration with Finalize Draft Button

**User Story:** As a content creator, I want to click a "Finalize Draft" button to mark my post as complete, so that I can signal that my content is ready for final review.

#### Acceptance Criteria

1. WHEN I click the "Finalize Draft" button THEN the frontend SHALL call POST /posts/{id}/statuses with status "Complete"
2. WHEN the status update succeeds THEN the frontend SHALL update the local post state to reflect the new status
3. WHEN the status update fails THEN the frontend SHALL display an appropriate error message to the user
4. WHEN the API call is in progress THEN the "Finalize Draft" button SHALL be disabled to prevent duplicate requests

### Requirement 3: Editor Read-Only Behavior for Complete Posts

**User Story:** As a content creator, I want the editor to become read-only when my post status is "Complete", so that I can review my finalized content without accidentally making changes.

#### Acceptance Criteria

1. WHEN a post has status "Complete" THEN only the Review tab SHALL be enabled in the editor
2. WHEN a post has status "Complete" THEN suggestions SHALL NOT be displayed in the Review tab
3. WHEN a post has status "Complete" THEN the content SHALL be displayed in read-only mode
4. WHEN a post has status "Complete" THEN editing controls SHALL be disabled or hidden
5. WHEN a post status changes from "Complete" to "Draft" THEN normal editing functionality SHALL be restored

### Requirement 4: Simple API Integration

**User Story:** As a developer, I want the post status endpoint to work with existing authentication and follow basic API patterns, so that it integrates easily with the current system.

#### Acceptance Criteria

1. WHEN calling the endpoint THEN it SHALL require valid JWT authentication like other protected endpoints
2. WHEN the status update succeeds THEN the system SHALL return 204 No Content
3. WHEN the status property is provided THEN it SHALL accept values "Draft" or "Complete"
4. WHEN the post is not found THEN the system SHALL return 404 Not Found
