# Design Document

## Overview

The async review system enables users to trigger content analysis workflows asynchronously and receive real-time notifications when analysis is complete. The system leverages existing AWS infrastructure including EventBridge, Step Functions, and introduces Momento for real-time messaging to provide a seamless user experience.

## Architecture

### High-Level Flow

1. **Trigger Review**: User calls POST /posts/{id}/reviews
2. **Start Workflow**: API publishes EventBridge message to start Step Function
3. **Return Token**: API generates and returns scoped Momento auth token
4. **UI Polling**: Frontend uses token to subscribe to Momento topic via HTTP long polling
5. **Workflow Completion**: Step Function publishes completion/error message to Momento
6. **UI Notification**: Frontend receives message, shows notification, refreshes suggestions

### System Components

```mermaid
graph TB
    UI[Frontend UI] --> API[POST /posts/{id}/reviews]
    API --> EB[EventBridge]
    API --> MT[Momento Token Service]
    EB --> SF[Step Function Workflow]
    SF --> MA[Momento Message Publisher]
    UI --> MP[Momento HTTP Polling]
    MP --> UI
    MA --> MP
    UI --> GS[GET /posts/{id}/suggestions]
```

## Components and Interfaces

### 1. POST /posts/{id}/reviews API Endpoint

**Location**: `functions/api/start-review.mjs`

**Responsibilities**:
- Validate user access to the post
- Generate scoped Momento auth token
- Publish EventBridge message to start workflow
- Return token and review session info

**Request/Response**:
```typescript
// Request: POST /posts/{id}/reviews
// Response:
{
  reviewId: string;
  momentoToken: string;
  topicName: string;
  expiresAt: number;
}
```

### 2. Momento Token Service

**Location**: `functions/utils/momento-auth.mjs`

**Responsibilities**:
- Generate scoped auth tokens for specific topics
- Ensure proper tenant isolation
- Set appropriate expiration times

**Interface**:
```javascript
export const generateScopedToken = (tenantId, contentId, expirationMinutes = 30) => {
  // Returns: { token: string, topicName: string, expiresAt: number }
}
```

### 3. Momento Message Publisher

**Location**: `functions/utils/momento-publisher.mjs`

**Responsibilities**:
- Publish completion/error messages to topics
- Handle message formatting and tenant isolation

**Interface**:
```javascript
export const publishReviewComplete = (tenantId, contentId, success, error = null) => {
  // Publishes to topic: `${tenantId}#${contentId}`
}
```

### 4. Step Function Workflow Updates

**Location**: `workflows/analyze-content.asl.json`

**Changes Required**:
- Add Momento message publishing on success
- Add Momento error message publishing on failure
- Include review session context

### 5. Frontend Integration

**Location**: `blog-editor-ui/src/services/review-service.ts`

**Responsibilities**:
- Call review API endpoint
- Manage Momento HTTP polling
- Handle notifications and UI updates
- Retry logic for failed operations

## Data Models

### Review Session
```typescript
interface ReviewSession {
  reviewId: string;
  tenantId: string;
  contentId: string;
  status: 'pending' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  momentoToken: string;
  topicName: string;
  expiresAt: number;
}
```

### Momento Messages
```typescript
interface ReviewCompleteMessage {
  type: 'review_complete';
  reviewId: string;
  contentId: string;
  success: boolean;
  completedAt: number;
  error?: string;
}

interface ReviewErrorMessage {
  type: 'review_error';
  reviewId: string;
  contentId: string;
  error: string;
  failedAt: number;
  retryable: boolean;
}
```

### API Response Types
```typescript
interface StartReviewResponse {
  reviewId: string;
  momentoToken: string;
  topicName: string;
  expiresAt: number;
}
```

## Error Handling

### Backend Error Scenarios

1. **Post Not Found/Access Denied**
   - Return 403/404 with appropriate message
   - No EventBridge message published

2. **EventBridge Publishing Failure**
   - Return 500 error to client
   - Log error for monitoring

3. **Momento Token Generation Failure**
   - Return 500 error to client
   - Log error for monitoring

4. **Step Function Workflow Failure**
   - Publish error message to Momento topic
   - Include retry information

### Frontend Error Scenarios

1. **Network Errors During Polling**
   - Show error notification with retry button
   - Implement exponential backoff

2. **Token Expiration**
   - Gracefully stop polling
   - Show timeout message with manual refresh option

3. **Review Failure Messages**
   - Show error notification with retry button
   - Allow user to restart review process

## Testing Strategy

### Backend Testing

1. **Unit Tests**
   - Test Momento token generation with various scopes
   - Test EventBridge message publishing
   - Test error handling scenarios

2. **Integration Tests**
   - Test complete review flow end-to-end
   - Test Step Function workflow with Momento publishing
   - Test error scenarios and message publishing

### Frontend Testing

1. **Component Tests**
   - Test notification component animations
   - Test retry button functionality
   - Test loading states

2. **Service Tests**
   - Test Momento HTTP polling service
   - Test error handling and retry logic
   - Test token expiration handling

### Manual Testing Scenarios

1. **Happy Path**
   - Start review, wait for completion, verify notification
   - Verify suggestions refresh automatically

2. **Error Scenarios**
   - Test network failures during polling
   - Test Step Function failures
   - Test token expiration

3. **UI/UX Testing**
   - Verify notification animations
   - Test retry functionality
   - Verify loading indicators

## Security Considerations

### Momento Token Scoping

- Tokens scoped to specific topic: `${tenantId}#${contentId}`
- Short expiration time (30 minutes)
- Subscribe-only permissions (no publish)

### Tenant Isolation

- All topic names include tenantId prefix
- API validates post ownership before generating tokens
- Messages include tenant validation

### Token Security

- Tokens transmitted over HTTPS only
- No sensitive data in topic names
- Tokens expire automatically

## Performance Considerations

### Momento Usage

- Use HTTP polling instead of WebSockets for simplicity
- Implement reasonable polling intervals (5-10 seconds)
- Stop polling after receiving message or timeout

### API Performance

- Minimal processing in review endpoint
- Async EventBridge publishing
- Fast token generation

### Frontend Performance

- Efficient polling implementation
- Proper cleanup of polling intervals
- Minimal DOM updates for notifications

## Monitoring and Observability

### Metrics to Track

- Review API response times
- EventBridge message publishing success rate
- Momento token generation success rate
- Step Function completion rates
- Frontend polling success rates

### Logging Strategy

- Log all review session starts and completions
- Log Momento token generation and usage
- Log EventBridge message publishing
- Log frontend polling errors and retries

### Alerting

- Alert on high error rates in review API
- Alert on EventBridge publishing failures
- Alert on Momento service unavailability
- Alert on Step Function failure rates
