# Requirements Document

## Introduction

This feature enhances the existing update-post functionality to provide intelligent version management, asynchronous content analysis, suggestion lifecycle management, and comprehensive status handling. The system will automatically increment versions only when content changes, trigger background analysis workflows, manage suggestion validity, and provide endpoints for suggestion status management while maintaining optimal user experience through asynchronous processing.

## Requirements

### Requirement 1: Intelligent Version Management

**User Story:** As a content creator, I want the system to automatically increment the post version only when the content actually changes, so that I can track meaningful content revisions without noise from metadata-only updates.

#### Acceptance Criteria

1. WHEN a post is updated AND the body field has changed THEN the system SHALL increment the version number by 1
2. WHEN a post is updated AND only title or status fields have changed THEN the system SHALL NOT increment the version number
3. WHEN the version is incremented THEN the system SHALL update the updatedAt timestamp
4. WHEN the version is not incremented THEN the system SHALL still update the updatedAt timestamp

### Requirement 2: Asynchronous Content Analysis Trigger

**User Story:** As a content creator, I want the system to automatically analyze my content for suggestions when I update it, so that I receive relevant feedback without waiting for the analysis to complete.

#### Acceptance Criteria

1. WHEN a post body is updated THEN the system SHALL publish an EventBridge event to trigger content analysis
2. WHEN the post status changes to "published" THEN the system SHALL publish an EventBridge event with special directives
3. WHEN the update-post API is called THEN the system SHALL return a 204 status code with empty response body for successful updates
4. WHEN content analysis is triggered THEN the user SHALL NOT wait for the analysis to complete before receiving the API response

### Requirement 3: Suggestion Lifecycle Management

**User Story:** As a content creator, I want outdated suggestions to be automatically cleaned up when I update my content, so that I only see relevant suggestions for the current version of my content.

#### Acceptance Criteria

1. WHEN content analysis is triggered THEN the system SHALL scan existing suggestions for validity
2. WHEN a suggestion's anchor text and surrounding context cannot be found in the updated content THEN the system SHALL mark the suggestion status as "skipped"
3. WHEN a suggestion's anchor text and surrounding context are still present THEN the system SHALL update the suggestion's version to match the current post version
4. WHEN the post status changes to "published" THEN the system SHALL mark all remaining suggestions with status "pending" as "rejected"

### Requirement 4: Suggestion Status Management API

**User Story:** As a content creator, I want to manage the status of individual suggestions (accept, reject, or delete), so that I can control which suggestions are applied and track suggestion outcomes.

#### Acceptance Criteria

1. WHEN I call POST /posts/{id}/suggestions/{id}/statuses with status "accepted" THEN the system SHALL update the suggestion status to "accepted" and return 204
2. WHEN I call POST /posts/{id}/suggestions/{id}/statuses with status "rejected" THEN the system SHALL update the suggestion status to "rejected" and return 204
3. WHEN I call POST /posts/{id}/suggestions/{id}/statuses with status "deleted" THEN the system SHALL permanently delete the suggestion and return 204
4. WHEN the system marks suggestions as "skipped" THEN these SHALL be treated as automatically rejected suggestions for statistics purposes
4. WHEN I update a suggestion status THEN the system SHALL NOT modify the post content itself
5. WHEN the suggestion status endpoint is called THEN the system SHALL validate that the suggestion belongs to the specified post and tenant

### Requirement 5: Tenant Statistics Tracking

**User Story:** As a tenant administrator, I want the system to track suggestion outcomes and statistics, so that I can understand content improvement patterns and system effectiveness.

#### Acceptance Criteria

1. WHEN a suggestion status is updated THEN the system SHALL update tenant-level statistics
2. WHEN suggestions are created, accepted, rejected, or deleted THEN the system SHALL increment appropriate counters in the tenant stats record
3. WHEN tenant stats are updated THEN the system SHALL maintain all-time totals for suggestions by type and outcome
4. WHEN a tenant stats record doesn't exist THEN the system SHALL create one with initial values

### Requirement 6: Background Processing Architecture

**User Story:** As a system administrator, I want content analysis and suggestion management to happen asynchronously, so that API response times remain fast and the system can handle high loads efficiently.

#### Acceptance Criteria

1. WHEN the update-post function completes THEN it SHALL publish an EventBridge event with post details and processing directives
2. WHEN the EventBridge event is received THEN a separate Lambda function SHALL handle content analysis and suggestion management
3. WHEN background processing encounters errors THEN the system SHALL log errors appropriately without affecting the original API response
4. WHEN background processing is triggered THEN it SHALL have access to the updated post content and version information

### Requirement 7: Suggestion Visibility Management

**User Story:** As a content creator, I want to only see suggestions that are still pending my review, so that I can focus on actionable feedback without being distracted by already-processed suggestions.

#### Acceptance Criteria

1. WHEN I call GET /posts/{id}/suggestions THEN the system SHALL only return suggestions with status "pending"
2. WHEN suggestions have status "accepted", "rejected", "deleted", or "skipped" THEN they SHALL NOT be included in the get-suggestions response
3. WHEN a suggestion status is updated from "pending" to any other status THEN it SHALL immediately disappear from future get-suggestions calls

### Requirement 8: Error Handling and Validation

**User Story:** As a content creator, I want clear error messages when something goes wrong with post updates or suggestion management, so that I can understand and resolve issues quickly.

#### Acceptance Criteria

1. WHEN the update-post API receives invalid input THEN it SHALL return appropriate 400 error responses with validation details
2. WHEN a post is not found or access is denied THEN the system SHALL return appropriate 404 or 403 error responses
3. WHEN the suggestion status API receives invalid status values THEN it SHALL return 400 error with allowed values
4. WHEN background processing fails THEN the system SHALL log detailed error information for debugging
5. WHEN database operations fail THEN the system SHALL handle errors gracefully and return appropriate HTTP status codes
