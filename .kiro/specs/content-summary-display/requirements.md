# Requirements Document

## Introduction

The get-suggestions API endpoint now includes a 3-sentence summary of the current version of content. This summary provides users with a quick overview of their content's key points and themes. We need to surface this summary in the blog editor interface to help users understand their content at a glance and make informed decisions about suggested improvements.

## Requirements

### Requirement 1

**User Story:** As a content creator, I want to see a summary of my current content version, so that I can quickly understand the key points and themes of my writing.

#### Acceptance Criteria

1. WHEN the user opens a blog post in the editor THEN the system SHALL display the content summary if available
2. WHEN the content summary is displayed THEN it SHALL be clearly labeled as a summary of the current version
3. WHEN no summary is available THEN the system SHALL gracefully handle the absence without showing empty or error states

### Requirement 2

**User Story:** As a content creator, I want the summary to be visually distinct from suggestions, so that I can easily differentiate between content overview and actionable feedback.

#### Acceptance Criteria

1. WHEN the summary is displayed THEN it SHALL use a distinct visual design from suggestion cards
2. WHEN the summary is displayed THEN it SHALL be positioned prominently but not interfere with the editing workflow
3. WHEN the summary is displayed THEN it SHALL use appropriate typography and spacing for readability

### Requirement 3

**User Story:** As a content creator, I want the summary to update when my content changes significantly, so that the overview remains accurate and relevant.

#### Acceptance Criteria

1. WHEN the user triggers a new review process THEN the system SHALL fetch the updated summary along with new suggestions
2. WHEN the summary is refreshed THEN it SHALL reflect the current version of the content
3. WHEN the summary loading fails THEN the system SHALL handle the error gracefully without breaking the editor experience
