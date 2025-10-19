# Requirements Document

## Introduction

This feature implements comprehensive suggestion statistics tracking and display throughout the blog editor system. The system will automatically update tenant statistics when suggestions are modified, provide a stats API endpoint, and integrate statistics display into the user interface with both dashboard metrics and a detailed "About My Writing" page.

## Requirements

### Requirement 1

**User Story:** As a blog writer, I want my suggestion statistics to be automatically updated when I interact with suggestions, so that I can track my writing improvement over time without manual effort.

#### Acceptance Criteria

1. WHEN a suggestion status is updated via update-suggestion-status THEN the system SHALL update the tenant's suggestion statistics
2. WHEN the post-processing function modifies suggestions THEN the system SHALL update the tenant's suggestion statistics
3. WHEN statistics are updated THEN the system SHALL maintain accurate counts for accepted, rejected, and pending suggestions
4. WHEN statistics are updated THEN the system SHALL track suggestion types (LLM, brand, fact, grammar, spelling)
5. IF a suggestion status change fails THEN the system SHALL log the error but not block the primary operation

### Requirement 2

**User Story:** As a blog writer, I want to view my writing statistics through an API endpoint, so that the system can display my progress and metrics in the user interface.

#### Acceptance Criteria

1. WHEN I request GET /stats THEN the system SHALL return my current suggestion statistics
2. WHEN I request GET /stats THEN the system SHALL return the total number of posts I have created from the stored post count
3. WHEN I request GET /stats THEN the system SHALL return statistics broken down by suggestion type
4. WHEN I request GET /stats THEN the system SHALL return statistics broken down by suggestion status
5. IF I am not authenticated THEN the system SHALL return a 401 unauthorized error
6. IF my tenant has no statistics THEN the system SHALL return zero values for all metrics

### Requirement 6

**User Story:** As a blog writer, I want my post count to be automatically tracked when I create or delete posts, so that my statistics are always accurate and up-to-date.

#### Acceptance Criteria

1. WHEN I create a new post THEN the system SHALL increment the total post count in my tenant statistics
2. WHEN I delete a post THEN the system SHALL decrement the total post count in my tenant statistics
3. WHEN post count updates fail THEN the system SHALL log the error but not block the primary post operation
4. WHEN the tenant statistics record doesn't exist THEN the system SHALL create it with appropriate initial values
5. WHEN I view my statistics THEN the post count SHALL reflect the stored value rather than being calculated on-demand

### Requirement 3

**User Story:** As a blog writer, I want to see high-level writing metrics on my dashboard, so that I can quickly understand my writing progress and activity.

#### Acceptance Criteria

1. WHEN I view the dashboard THEN the system SHALL display my total number of posts
2. WHEN I view the dashboard THEN the system SHALL display my total suggestions received
3. WHEN I view the dashboard THEN the system SHALL display my suggestion acceptance rate
4. WHEN I view the dashboard THEN the system SHALL display recent writing activity metrics
5. WHEN statistics are updated THEN the dashboard SHALL reflect the changes without requiring a page refresh
6. IF statistics are loading THEN the system SHALL show appropriate loading states

### Requirement 4

**User Story:** As a blog writer, I want to access detailed writing statistics through an "About My Writing" page, so that I can analyze my writing patterns and improvement areas in depth.

#### Acceptance Criteria

1. WHEN I click on my avatar in the header THEN the system SHALL show a context menu with "About My Writing" option
2. WHEN I select "About My Writing" THEN the system SHALL navigate to a detailed statistics page
3. WHEN I view the detailed statistics page THEN the system SHALL display suggestion statistics by type
4. WHEN I view the detailed statistics page THEN the system SHALL display suggestion statistics by status
5. WHEN I view the detailed statistics page THEN the system SHALL display writing trends over time
6. WHEN I view the detailed statistics page THEN the system SHALL display actionable insights about my writing patterns

### Requirement 5

**User Story:** As a blog writer, I want to interact with suggestions directly in the editor, so that I can accept, reject, or modify suggestions while writing.

#### Acceptance Criteria

1. WHEN I view a post in the editor THEN the system SHALL display all suggestions for that post
2. WHEN I view suggestions in the editor THEN the system SHALL group suggestions by type with appropriate visual indicators
3. WHEN I click on a suggestion THEN the system SHALL allow me to accept, reject, or modify it
4. WHEN I accept a suggestion THEN the system SHALL apply the change to the content and update statistics
5. WHEN I reject a suggestion THEN the system SHALL mark it as rejected and update statistics
6. WHEN I modify a suggestion THEN the system SHALL save the modified version and update statistics
7. WHEN suggestions are updated THEN the system SHALL provide immediate visual feedback
8. IF suggestion updates fail THEN the system SHALL show clear error messages and allow retry
