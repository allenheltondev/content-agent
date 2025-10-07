# Requirements Document

## Introduction

This feature addresses critical usability and functionality issues in the blog editor component. The improvements focus on proper draft management, adding missing content fields, consolidating review functionality, and implementing real-time review feedback through long polling.

## Requirements

### Requirement 1

**User Story:** As a content creator, I want my local drafts to be properly managed so that I don't see unnecessary draft dialogs and my storage stays clean.

#### Acceptance Criteria

1. WHEN a user successfully saves a post THEN the system SHALL clear the corresponding local storage draft
2. WHEN a user loads content from the API AND the local draft content matches the loaded content THEN the system SHALL NOT display the draft found dialog
3. WHEN a user loads content from the API AND the local draft content differs from the loaded content THEN the system SHALL display the draft found dialog with options to keep or discard the draft

### Requirement 2

**User Story:** As a content creator, I want a single "Submit for Review" action that provides real-time feedback so that I can efficiently review my content without confusion.

#### Acceptance Criteria

1. WHEN a user clicks "Submit for Review" THEN the system SHALL call the review endpoint
2. WHEN the review endpoint responds successfully THEN the system SHALL receive a token and endpoint for long polling
3. WHEN the system receives the token and endpoint THEN the system SHALL automatically start long polling for review results
4. WHEN the system starts long polling THEN the system SHALL scroll the page to the top
5. WHEN review results are received via long polling THEN the system SHALL display the suggestions to the user
6. WHEN the review process fails THEN the system SHALL display an appropriate error message to the user

### Requirement 3

**User Story:** As a developer, I want the UI to handle the simplified review endpoint response format so that integration is straightforward and maintainable.

#### Acceptance Criteria

1. WHEN the review endpoint is called THEN the system SHALL expect a response containing token and endpoint fields
2. WHEN the system receives the review response THEN the system SHALL extract the token and endpoint for long polling setup
3. WHEN setting up long polling THEN the system SHALL use the provided token and endpoint from the review response
