# Requirements Document

## Introduction

The blog editor application needs backend API endpoints to support user profile management functionality. These endpoints will enable users to create, read, and update their writing profiles, which contain preferences for AI-powered writing assistance. The API must follow the same patterns as existing blog post endpoints, using Lambda functions, DynamoDB storage, and proper tenant isolation for security.

## Requirements

### Requirement 1

**User Story:** As a frontend application, I want to create a new user profile via API, so that new users can save their writing preferences after completing profile setup.

#### Acceptance Criteria

1. WHEN the frontend sends a POST request to /profile THEN the system SHALL create a new profile record in DynamoDB
2. WHEN creating a profile THEN the system SHALL validate the request body contains required fields (writingTone, writingStyle, topics, skillLevel)
3. WHEN creating a profile THEN the system SHALL use the authenticated user's tenantId and userId from the JWT token
4. WHEN creating a profile THEN the system SHALL return the created profile data with timestamps
5. WHEN creating a profile THEN the system SHALL prevent duplicate profiles for the same user
6. WHEN profile creation fails THEN the system SHALL return appropriate error responses with clear messages

### Requirement 2

**User Story:** As a frontend application, I want to retrieve a user's profile via API, so that I can display their current preferences and populate edit forms.

#### Acceptance Criteria

1. WHEN the frontend sends a GET request to /profile THEN the system SHALL return the user's profile data
2. WHEN retrieving a profile THEN the system SHALL use the authenticated user's tenantId and userId from the JWT token
3. WHEN retrieving a profile THEN the system SHALL return all profile fields (writingTone, writingStyle, topics, skillLevel, timestamps)
4. WHEN no profile exists for the user THEN the system SHALL return a 404 Not Found response
5. WHEN profile retrieval fails THEN the system SHALL return appropriate error responses

### Requirement 3

**User Story:** As a frontend application, I want to update an existing user profile via API, so that users can modify their writing preferences over time.

#### Acceptance Criteria

1. WHEN the frontend sends a PUT request to /profile THEN the system SHALL update the existing profile record
2. WHEN updating a profile THEN the system SHALL validate the request body contains valid field values
3. WHEN updating a profile THEN the system SHALL use the authenticated user's tenantId and userId from the JWT token
4. WHEN updating a profile THEN the system SHALL update the updatedAt timestamp
5. WHEN updating a profile THEN the system SHALL return the updated profile data
6. WHEN no profile exists to update THEN the system SHALL return a 404 Not Found response
7. WHEN profile update fails THEN the system SHALL return appropriate error responses

### Requirement 4

**User Story:** As the system, I want to ensure proper tenant isolation for profile data, so that users can only access their own profiles and data remains secure.

#### Acceptance Criteria

1. WHEN any profile API endpoint is called THEN the system SHALL authenticate the user using the existing JWT authorizer
2. WHEN accessing profile data THEN the system SHALL use the tenantId from the JWT token to scope data access
3. WHEN storing profile data THEN the system SHALL use composite keys that include tenantId for proper isolation
4. WHEN a user tries to access another tenant's data THEN the system SHALL deny access
5. WHEN authentication fails THEN the system SHALL return 401 Unauthorized responses

### Requirement 5

**User Story:** As the frontend application, I want profile API responses to match the expected data structure, so that existing frontend code works without modification.

#### Acceptance Criteria

1. WHEN creating a profile THEN the system SHALL return a response with structure { profile: UserProfile }
2. WHEN updating a profile THEN the system SHALL return a response with structure { profile: UserProfile }
3. WHEN retrieving a profile THEN the system SHALL return a response with structure { profile: UserProfile }
4. WHEN returning profile data THEN the system SHALL include all required fields (userId, email, name, writingTone, writingStyle, topics, skillLevel, isComplete, createdAt, updatedAt, version)
5. WHEN creating a profile THEN the system SHALL set isComplete to true and version to 1
6. WHEN updating a profile THEN the system SHALL increment the version number

### Requirement 6

**User Story:** As the system, I want to follow the same patterns as existing API endpoints, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. WHEN implementing profile endpoints THEN the system SHALL use the same Lambda function structure as existing API functions
2. WHEN implementing profile endpoints THEN the system SHALL use the same DynamoDB patterns with pk/sk and GSI1PK/GSI1SK
3. WHEN implementing profile endpoints THEN the system SHALL use the same error handling and response formatting patterns
4. WHEN implementing profile endpoints THEN the system SHALL use Zod for request validation like existing endpoints
5. WHEN implementing profile endpoints THEN the system SHALL follow the same AWS SDK v3 patterns and connection reuse
6. WHEN implementing profile endpoints THEN the system SHALL use the same CORS and API Gateway configuration
