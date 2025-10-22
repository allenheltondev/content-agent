# Design Document

## Overview

This design implements a dedicated POST endpoint for updating blog post status, following the existing API patterns in the system. The solution provides a simple, focused endpoint that handles status transitions from "Draft" to "Complete" and integrates with the frontend editor's read-only behavior.

## Architecture

### API Endpoint Design
- **Endpoint**: `POST /posts/{postId}/statuses`
- **Method**: POST (following REST conventions for status updates)
- **Authentication**: JWT-based authentication using existing Lambda authorizer
- **Response**: 204 No Content on success (consistent with other update endpoints)

### Request/Response Format
```json
// Request Body
{
  "status": "Draft" | "Complete"
}

// Success Response: 204 No Content (empty body)

// Error Responses
{
  "error": "Post not found"           // 404
}
{
  "error": "Invalid status value"     // 400
}
```

## Components and Interfaces

### Lambda Function: UpdatePostStatusFunction
- **File**: `functions/api/update-post-status.mjs`
- **Handler**: `api/update-post-status.handler`
- **Runtime**: Node.js 22.x with ES modules
- **Timeout**: 25 seconds (standard API timeout)
- **Memory**: 1024 MB (standard API memory)

### DynamoDB Integration
- **Table**: Existing ContentTable
- **Key Pattern**: `pk: ${tenantId}#${postId}`, `sk: 'content'`
- **Update Pattern**: Simple status field update with timestamp
- **No version increment**: Status-only changes don't increment version

### API Gateway Integration
- **Path**: `/posts/{postId}/statuses`
- **Method**: POST
- **Authorizer**: Existing LambdaAuthorizer
- **CORS**: Enabled with existing configuration

## Data Models

### DynamoDB Item Structure
```javascript
// Existing post item - only status and updatedAt fields are modified
{
  pk: `${tenantId}#${postId}`,
  sk: 'content',
  contentId: postId,
  title: 'Post Title',
  body: 'Post content...',
  status: 'Draft' | 'Complete',  // Updated field
  version: '1.0',                // NOT incremented for status changes
  createdAt: 1640995200,
  updatedAt: 1640995300,         // Updated timestamp
  tenantId: tenantId
}
```

### Request Validation
- **Required field**: `status`
- **Allowed values**: `"Draft"`, `"Complete"`
- **Content-Type**: `application/json`

## Implementation Details

### Lambda Function Structure
```javascript
export const handler = async (event) => {
  try {
    // Extract tenant and post ID from context
    const { tenantId } = event.requestContext.authorizer;
    const { postId } = event.pathParameters;

    // Parse and validate request body
    const { status } = JSON.parse(event.body || '{}');

    // Validate status value
    if (!['Draft', 'Complete'].includes(status)) {
      return formatResponse(400, { error: 'Invalid status value' });
    }

    // Check if post exists and belongs to tenant
    const getResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      })
    }));

    if (!getResponse.Item) {
      return formatResponse(404, { error: 'Post not found' });
    }

    // Update status and timestamp only
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${postId}`,
        sk: 'content'
      }),
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: marshall({
        ':status': status,
        ':updatedAt': Date.now()
      })
    }));

    return formatResponse(204);

  } catch (error) {
    console.error('Update post status error:', error);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
```

### Frontend Integration Points

#### API Service Method
```typescript
// Add to existing API service
async updatePostStatus(postId: string, status: 'Draft' | 'Complete'): Promise<void> {
  const response = await fetch(`/api/posts/${postId}/statuses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getToken()}`
    },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    throw new Error('Failed to update post status');
  }
}
```

#### Finalize Draft Button Handler
```typescript
const handleFinalizeDraft = async () => {
  try {
    setIsUpdating(true);
    await apiService.updatePostStatus(postId, 'Complete');
    setPost(prev => ({ ...prev, status: 'Complete' }));
  } catch (error) {
    setError('Failed to finalize draft');
  } finally {
    setIsUpdating(false);
  }
};
```

#### Editor Read-Only Logic
```typescript
const isReadOnly = post.status === 'Complete';
const showSuggestions = post.status !== 'Complete';
const enabledTabs = post.status === 'Complete' ? ['Review'] : ['Edit', 'Review'];
```

## Error Handling

### Error Scenarios
1. **Invalid JSON**: Return 400 with parsing error
2. **Missing status field**: Return 400 with validation error
3. **Invalid status value**: Return 400 with allowed values
4. **Post not found**: Return 404
5. **Database errors**: Return 500 with generic message

### Error Response Format
```javascript
// Consistent with existing API error format
{
  "error": "Human-readable error message"
}
```

## Testing Strategy

### Unit Tests (Backend)
- Test valid status updates ("Draft" → "Complete", "Complete" → "Draft")
- Test invalid status values
- Test post not found scenarios
- Test tenant isolation
- Test database error handling

### Integration Testing (Manual)
- Test "Finalize Draft" button functionality
- Verify editor becomes read-only for Complete posts
- Test suggestions are hidden for Complete posts
- Verify error handling in UI

### API Testing
- Test endpoint with valid payloads
- Test authentication requirements
- Test CORS headers
- Test error responses
