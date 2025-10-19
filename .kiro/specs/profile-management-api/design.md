# Design Document

## Overview

This design implements backend API endpoints for user profile management in the blog editor application. The solution provides three RESTful endpoints (GET, POST, PUT /profile) that enable frontend applications to manage user writing preferences and profile data. The design follows existing patterns established by the blog post API endpoints, ensuring consistency in authentication, data storage, error handling, and response formatting.

## Architecture

### API Endpoint Architecture
```
API Ga (/api/profile)
├── GET /profile → GetProfileFunction
├── POST /profile → CreateProfileFunction
└── PUT /profile → UpdateProfileFunction
```

### Data Flow Architecture
```
Frontend Request → API Gateway → Lambda Authorizer → Profile Lambda Function → DynamoDB → Response
                                      ↓
                              JWT Token Validation
                              Tenant/User Extraction
```

### Lambda Function Architecture
```
Profile Lambda Functions
├── Shared Dependencies
│   ├── AWS SDK v3 (DynamoDB Client)
│   ├── Zod Validation Schemas
│   ├── Response Formatting Utilities
│   └── Error Handling Patterns
├── GetProfileFunction
├── CreateProfileFunction
└── UpdateProfileFunction
```

## Components and Interfaces

### 1. API Endpoints

#### GET /profile
- **Purpose**: Retrieve current user's profile
- **Authentication**: Required (JWT via Lambda Authorizer)
- **Request**: No body required
- **Response**: `{ profile: UserProfile }`
- **Status Codes**: 200 (success), 404 (not found), 401 (unauthorized), 500 (error)

#### POST /profile
- **Purpose**: Create new user profile during initial setup
- **Authentication**: Required (JWT via Lambda Authorizer)
- **Request Body**: `CreateProfileRequest`
- **Response**: `{ profile: UserProfile }`
- **Status Codes**: 201 (created), 400 (validation error), 409 (already exists), 401 (unauthorized), 500 (error)

#### PUT /profile
- **Purpose**: Update existing user profile
- **Authentication**: Required (JWT via Lambda Authorizer)
- **Request Body**: `UpdateProfileRequest`
- **Response**: `{ profile: UserProfile }`
- **Status Codes**: 200 (updated), 400 (validation error), 404 (not found), 401 (unauthorized), 500 (error)

### 2. Data Models

#### DynamoDB Profile Record Structure
```javascript
{
  // Primary key structure (following existing patterns)
  pk: `${tenantId}`,             // Partition key (simplified since tenantId === userId)
  sk: 'profile',                         // Sort key

  // GSI for tenant-scoped queries
  GSI1PK: tenantId,                      // GSI partition key
  GSI1SK: 'profile',                     // GSI sort key

  // Profile data
  userId: string,                        // Cognito user ID
  tenantId: string,                      // Tenant identifier
  email: string,                         // User email from Cognito
  name: string,                          // User name from Cognito
  writingTone: string,                   // Freetext description
  writingStyle: string,                  // Freetext description
  topics: string[],                      // Array of topic strings
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert',

  // Metadata
  isComplete: boolean,                   // Always true for created profiles
  version: number,                       // Incremented on updates
  createdAt: number,                     // Unix timestamp
  updatedAt: number                      // Unix timestamp
}
```

#### Request/Response Schemas

**CreateProfileRequest**
```typescript
{
  writingTone: string;        // Required, non-empty
  writingStyle: string;       // Required, non-empty
  topics: string[];          // Required, at least one topic
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}
```

**UpdateProfileRequest**
```typescript
{
  writingTone?: string;       // Optional
  writingStyle?: string;      // Optional
  topics?: string[];         // Optional
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}
```

**UserProfile Response**
```typescript
{
  userId: string;
  email: string;
  name: string;
  writingTone: string;
  writingStyle: string;
  topics: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  isComplete: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}
```

### 3. Lambda Function Implementations

#### GetProfileFunction
```javascript
// Key responsibilities:
// 1. Extract tenantId/userId from JWT context
// 2. Query DynamoDB using composite key
// 3. Transform DynamoDB item to UserProfile format
// 4. Return formatted response or 404 if not found

const handler = async (event) => {
  const { tenantId, userId } = event.requestContext.authorizer;

  // Query: pk = `${tenantId}`, sk = 'profile'
  const response = await ddb.send(new GetItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({ pk: `${tenantId}`, sk: 'profile' })
  }));

  if (!response.Item) {
    return formatResponse(404, { error: 'Profile not found' });
  }

  const profile = transformToUserProfile(unmarshall(response.Item));
  return formatResponse(200, { profile });
};
```

#### CreateProfileFunction
```javascript
// Key responsibilities:
// 1. Parse request body (API Gateway handles validation)
// 2. Extract user info from JWT context and Cognito
// 3. Create profile record with proper keys and metadata
// 4. Handle duplicate profile prevention
// 5. Return created profile

const handler = async (event) => {
  const { tenantId, userId } = event.requestContext.authorizer;
  const requestBody = JSON.parse(event.body);

  const now = Date.now();
  const profileRecord = {
    pk: `${tenantId}`,
    sk: 'profile',
    userId,
    tenantId,
    email: getUserEmail(), // From Cognito
    name: getUserName(),   // From Cognito
    ...requestBody,
    isComplete: true,
    version: 1,
    createdAt: now,
    updatedAt: now
  };

  await ddb.send(new PutItemCommand({
    TableName: process.env.TABLE_NAME,
    Item: marshall(profileRecord),
    ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
  }));

  return formatResponse(201, { profile: transformToUserProfile(profileRecord) });
};
```

#### UpdateProfileFunction
```javascript
// Key responsibilities:
// 1. Parse request body (API Gateway handles validation)
// 2. Check profile exists before updating
// 3. Build dynamic UpdateExpression for changed fields
// 4. Increment version and update timestamp
// 5. Return updated profile

const handler = async (event) => {
  const { tenantId, userId } = event.requestContext.authorizer;
  const requestBody = JSON.parse(event.body);

  // Build update expression dynamically
  const updateExpression = buildUpdateExpression(requestBody);
  updateExpression.SET.push('version = version + :inc', 'updatedAt = :now');

  const response = await ddb.send(new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({ pk: `${tenantId}`, sk: 'profile' }),
    UpdateExpression: updateExpression.expression,
    ExpressionAttributeValues: marshall(updateExpression.values),
    ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
    ReturnValues: 'ALL_NEW'
  }));

  const profile = transformToUserProfile(unmarshall(response.Attributes));
  return formatResponse(200, { profile });
};
```

## Data Models

### DynamoDB Key Design

Following the established pattern from blog posts:

**Primary Key Structure:**
- `pk`: `${tenantId}` - Ensures tenant isolation (simplified since tenantId === userId)
- `sk`: `'profile'` - Distinguishes profile records from other user data

### Profile Data Schema

The profile record stores all user writing preferences and metadata:

```javascript
{
  // Identity and access control
  userId: "auth0|507f1f77bcf86cd799439011",
  tenantId: "tenant_abc123",
  email: "user@example.com",
  name: "John Doe",

  // Writing preferences (core profile data)
  writingTone: "I prefer a conversational and friendly tone that feels approachable...",
  writingStyle: "I write in a clear, structured style with short paragraphs...",
  topics: ["technology", "productivity", "remote work", "custom: AI ethics"],
  skillLevel: "intermediate",

  // Metadata
  isComplete: true,
  version: 1,
  createdAt: 1640995200000,
  updatedAt: 1640995200000
}
```

## Error Handling

### Validation Errors (400)
- Missing required fields in create requests
- Empty or invalid field values
- No fields provided for update requests
- Invalid skillLevel values

### Authentication Errors (401)
- Missing or invalid JWT token
- Expired authentication

### Authorization Errors (403)
- Attempting to access another tenant's data (handled by key structure)

### Not Found Errors (404)
- Profile doesn't exist for GET requests
- Profile doesn't exist for PUT requests

### Conflict Errors (409)
- Attempting to create profile when one already exists

### Server Errors (500)
- DynamoDB operation failures
- Unexpected runtime errors

### Error Response Format
Following existing API patterns:
```javascript
{
  error: "ValidationError",
  message: "Writing tone and style are required",
  details?: { /* additional context for development */ }
}
```

## Implementation Phases

### Phase 1: Core Lambda Functions
1. Create GetProfileFunction with DynamoDB integration
2. Create CreateProfileFunction with validation and duplicate prevention
3. Create UpdateProfileFunction with dynamic update expressions
4. Implement shared utilities for data transformation and error handling

### Phase 2: API Gateway Integration
1. Add profile endpoints to OpenAPI specification
2. Configure Lambda integrations in SAM template
3. Set up proper CORS and authentication
4. Test endpoint routing and response formatting

### Phase 3: Validation and Error Handling
1. Configure comprehensive API Gateway validation schemas
2. Add proper error handling for all failure scenarios
3. Test authentication and authorization flows
4. Verify tenant isolation and data security

### Phase 4: Testing and Documentation
1. Write unit tests for all Lambda functions
2. Create integration tests for API endpoints
3. Update API documentation
4. Verify frontend integration compatibility

## Design Decisions and Rationales

### Single Profile Per User Design
**Decision**: Use composite key `${tenantId}#profile` with sk='profile' to ensure one profile per user
**Rationale**: Simplifies data model and prevents confusion. Users should have exactly one profile that can be updated over time. Since tenantId equals userId, we can simplify the key structure.

### Freetext Writing Preferences
**Decision**: Store writingTone and writingStyle as freetext strings rather than predefined options
**Rationale**: Allows users to express their unique voice and preferences in their own words, providing richer context for AI assistance.

### Version Tracking
**Decision**: Include version field that increments on updates
**Rationale**: Enables optimistic locking, change tracking, and potential future features like profile history.

### Tenant Isolation via Composite Keys
**Decision**: Include tenantId in primary key structure
**Rationale**: Ensures complete data isolation between tenants at the database level, following security best practices.

### Consistent Response Wrapping
**Decision**: Wrap all profile responses in `{ profile: UserProfile }` structure
**Rationale**: Maintains consistency with existing API patterns and allows for future extension with additional metadata.

### Dynamic Update Expressions
**Decision**: Build UpdateExpression dynamically based on provided fields
**Rationale**: Allows partial updates while maintaining data integrity and avoiding unnecessary writes to unchanged fields.
