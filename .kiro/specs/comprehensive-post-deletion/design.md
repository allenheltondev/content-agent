# Design Document

## Overview

The comprehensive post deletion system will enhance the existing delete-post API to perform complete cleanup of all related data. The design follows an asynchronous pattern where the main post is deleted immediately for fast user response, while related data cleanup happens in the background using efficient DynamoDB operations.

## Architecture

### Current State Analysis

Based on the existing codebase analysis:

- **Main Post Storage**: `pk: ${tenantId}#${postId}`, `sk: 'content'`
- **Suggestions Storage**: `pk: ${tenantId}#${contentId}`, `sk: suggestion#${suggestionId}`
- **Audit Reports Storage**: `pk: ${tenantId}#${contentId}`, `sk: audit#${version}#${type}`
- **Statistics Integration**: Existing `decrementPostCount` function updates tenant statistics

### Enhanced Architecture

The enhanced delete-post function will:

1. **Immediate Operations** (synchronous):
   - Validate post existence and ownership
   - Delete main post content
   - Update tenant post count statistics
   - Return success response to user

2. **Cleanup Operations** (asynchronous):
   - Query and delete all suggestions for the post
   - Query and delete all audit reports for the post
   - Log cleanup results for monitoring

## Components and Interfaces

### Enhanced Delete-Post Handler

```javascript
export const handler = async (event) => {
  // 1. Validate and delete main post (existing logic)
  // 2. Trigger async cleanup (new logic)
  // 3. Return immediate response
}
```

### Async Cleanup Function

```javascript
const performAsyncCleanup = async (tenantId, postId) => {
  // 1. Query for all suggestions
  // 2. Query for all audit reports
  // 3. Batch delete operations
  // 4. Log results
}
```

### DynamoDB Query Patterns

**Query Suggestions:**
```javascript
// Use Query operation with pk = ${tenantId}#${postId} and sk begins_with 'suggestion#'
const suggestionsQuery = {
  TableName: process.env.TABLE_NAME,
  KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk_prefix)',
  ExpressionAttributeValues: {
    ':pk': `${tenantId}#${postId}`,
    ':sk_prefix': 'suggestion#'
  }
}
```

**Query Audit Reports:**
```javascript
// Use Query operation with pk = ${tenantId}#${postId} and sk begins_with 'audit#'
const auditsQuery = {
  TableName: process.env.TABLE_NAME,
  KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk_prefix)',
  ExpressionAttributeValues: {
    ':pk': `${tenantId}#${postId}`,
    ':sk_prefix': 'audit#'
  }
}
```

## Data Models

### Cleanup Result Model

```javascript
{
  postId: string,
  tenantId: string,
  deletedSuggestions: number,
  deletedAudits: number,
  errors: string[],
  completedAt: string
}
```

### Batch Delete Operations

The system will use DynamoDB's `batchWrite` operation for efficient deletion:

```javascript
// Group items into batches of 25 (DynamoDB limit)
const batches = chunkArray(itemsToDelete, 25);
for (const batch of batches) {
  await ddb.send(new BatchWriteItemCommand({
    RequestItems: {
      [TABLE_NAME]: batch.map(item => ({
        DeleteRequest: { Key: marshall({ pk: item.pk, sk: item.sk }) }
      }))
    }
  }));
}
```

## Error Handling

### Synchronous Error Handling

- **Post Not Found**: Return 404 with appropriate message
- **Unauthorized Access**: Return 401 with security logging
- **DynamoDB Errors**: Return 500 with generic message, log specific error
- **Statistics Update Failure**: Log error but don't block deletion

### Asynchronous Error Handling

- **Query Failures**: Log error with context, continue with other operations
- **Batch Delete Failures**: Retry individual items, log persistent failures
- **Partial Cleanup**: Log successful and failed operations separately

### Logging Strategy

```javascript
// Success logging
console.log('Post deletion completed', {
  operation: 'deletePost',
  postId,
  tenantId,
  deletedSuggestions: results.suggestions,
  deletedAudits: results.audits,
  duration: Date.now() - startTime
});

// Error logging
console.error('Cleanup operation failed', {
  operation: 'asyncCleanup',
  postId,
  tenantId,
  error: error.message,
  phase: 'suggestions' | 'audits'
});
```

## Testing Strategy

### Unit Testing Focus

1. **Main Delete Logic**: Test post validation, deletion, and immediate response
2. **Query Construction**: Verify correct DynamoDB query parameters
3. **Batch Operations**: Test batch creation and deletion logic
4. **Error Scenarios**: Test various failure modes and error handling

### Integration Testing

1. **End-to-End Cleanup**: Verify complete data removal across all related items
2. **Statistics Updates**: Confirm tenant statistics are correctly updated
3. **Tenant Isolation**: Ensure only tenant-owned data is affected
4. **Performance**: Validate response times meet requirements

### Test Data Setup

```javascript
// Test data structure for comprehensive testing
const testData = {
  post: { pk: 'tenant1#post1', sk: 'content' },
  suggestions: [
    { pk: 'tenant1#post1', sk: 'suggestion#uuid1' },
    { pk: 'tenant1#post1', sk: 'suggestion#uuid2' }
  ],
  audits: [
    { pk: 'tenant1#post1', sk: 'audit#1#llm' },
    { pk: 'tenant1#post1', sk: 'audit#1#brand' }
  ]
};
```

## Performance Considerations

### Query Efficiency

- Use `Query` operations instead of `Scan` for better performance
- Leverage sort key patterns for efficient filtering
- Implement pagination if large numbers of related items exist

### Batch Operations

- Group deletions into batches of 25 items (DynamoDB limit)
- Handle batch failures gracefully with individual item retry
- Use exponential backoff for retry logic

### Async Execution

- Use `setImmediate()` or `process.nextTick()` for non-blocking cleanup
- Consider Lambda timeout limits for very large cleanup operations
- Log progress for long-running cleanup operations

## Security Considerations

### Tenant Isolation

- Always validate tenant ownership before any deletion
- Use tenant ID from JWT token, never from request parameters
- Log security events for unauthorized access attempts

### Data Validation

- Validate post existence before cleanup operations
- Ensure all deleted items belong to the correct tenant
- Prevent deletion of items from other tenants

## Monitoring and Observability

### CloudWatch Metrics

- Track cleanup operation success/failure rates
- Monitor cleanup duration and item counts
- Alert on high error rates or performance degradation

### Structured Logging

- Include consistent fields: operation, tenantId, postId, duration
- Log both successful operations and errors with appropriate detail
- Use log levels appropriately (INFO for success, ERROR for failures)
