# API Service Layer

This directory contains the API service layer for backend communication, including JWT token injection, error handling, and retry logic.

## Overview

The `ApiService` class provides a comprehensive solution for communicating with the blog editor backend APIs. It includes:

- **JWT Token Injection**: Automatically includes Cognito JWT tokens in all requests
- **Error Handling**: Converts API errors to user-friendly messages
- **Retry Logic**: Implements exponential backoff for network failures and server errors
- **Request Cancellation**: Supports AbortController for cancelling requests
- **TypeScript Support**: Full type safety with interfaces

## Quick Start

### 1. Initialize the API Service

```typescript
import { initializeApiService } from './services';

// Initialize at app startup
initializeApiService({
  baseUrl: 'https://your-api-domain.com',
  getAuthToken: async () => {
    // Return JWT token from Cognito
    const session = await Auth.currentSession();
    return session.getIdToken().getJwtToken();
  }
});
```

### 2. Use with React Hooks

```typescript
import { useApi, useApiMutation } from './hooks';
import { apiService } from './services';

function MyComponent() {
  // For fetching data
  const { data: posts, loading, error, execute } = useApi<BlogPost[]>();

  // For mutations (create, update, delete)
  const { mutate: createPost, loading: creating } = useApiMutation<BlogPost>();

  useEffect(() => {
    execute(() => apiService.getPosts());
  }, []);

  const handleCreate = async () => {
    await createPost(() => apiService.createPost({
      title: 'New Post',
      body: 'Content here'
    }));
  };

  return (
    <div>
      {loading && <div>Loading...</div>}
      {error && <div>Error: {error}</div>}
      {posts?.map(post => <div key={post.id}>{post.title}</div>)}
      <button onClick={handleCreate} disabled={creating}>
        Create Post
      </button>
    </div>
  );
}
```

### 3. Direct API Service Usage

```typescript
import { apiService } from './services';

// Get all posts
const posts = await apiService.getPosts();

// Get specific post
const post = await apiService.getPost('post-id');

// Create new post
const newPost = await apiService.createPost({
  title: 'My Post',
  body: 'Post content'
});

// Update existing post
const updatedPost = await apiService.updatePost('post-id', {
  title: 'Updated Title'
});

// Get suggestions for a post
const suggestions = await apiService.getSuggestions('post-id');

// Delete a suggestion
await apiService.deleteSuggestion('suggestion-id');

// Submit post for review
await apiService.submitForReview('post-id');

// Finalize draft
await apiService.finalizeDraft('post-id');
```

## API Endpoints

The service expects these REST endpoints to be available:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts` | List user's blog posts |
| GET | `/api/posts/{id}` | Get specific blog post |
| POST | `/api/posts` | Create new blog post |
| PUT | `/api/posts/{id}` | Update existing blog post |
| GET | `/api/posts/{id}/suggestions` | Get suggestions for a post |
| DELETE | `/api/suggestions/{id}` | Delete a suggestion |
| POST | `/api/posts/{id}/submit-review` | Submit post for additional review |
| POST | `/api/posts/{id}/finalize` | Finalize the draft |

## Error Handling

The service provides comprehensive error handling:

### Error Types

- **Network Errors**: Connection failures, timeouts
- **Authentication Errors**: 401 (expired token), 403 (forbidden)
- **Client Errors**: 400 (bad request), 404 (not found), 422 (validation)
- **Server Errors**: 500+ (internal server errors)

### User-Friendly Messages

Errors are automatically converted to user-friendly messages:

```typescript
import { getErrorMessage, isRetryableError, requiresReauth } from './utils';

try {
  await apiService.getPosts();
} catch (error) {
  const message = getErrorMessage(error); // "Unable to connect to server..."
  const canRetry = isRetryableError(error); // true for 5xx errors
  const needsLogin = requiresReauth(error); // true for 401 errors
}
```

## Retry Logic

The service automatically retries failed requests:

- **Retryable Status Codes**: 408, 429, 500, 502, 503, 504
- **Max Retries**: 3 attempts
- **Backoff Strategy**: Exponential (1s, 2s, 4s, max 10s)
- **Network Errors**: Also retried with same logic

### Custom Retry Configuration

```typescript
const apiService = new ApiService(config, {
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 30000,
  retryableStatuses: [500, 502, 503, 504]
});
```

## Request Cancellation

All API methods support request cancellation:

```typescript
const abortController = new AbortController();

// Pass signal to any API method
const posts = await apiService.getPosts(abortController.signal);

// Cancel the request
abortController.abort();
```

React hooks automatically handle cancellation on component unmount.

## Testing

Frontend testing is done manually in the browser during development. This approach is:

- **Faster to iterate** - no test maintenance overhead
- **More reliable** - tests what users actually experience
- **Simpler** - focus on building features, not maintaining tests

For testing the API service:

1. Use the browser's Network tab to verify requests
2. Test error scenarios by temporarily breaking the backend
3. Use the example component to verify all functionality
4. Test authentication flows in a real browser environment

## TypeScript Support

All methods are fully typed with interfaces:

```typescript
interface BlogPost {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'review' | 'finalized' | 'published' | 'abandoned';
  version: number;
  createdAt: number;
  updatedAt: number;
  authorId: string;
}

interface Suggestion {
  id: string;
  contentId: string;
  startOffset: number;
  endOffset: number;
  textToReplace: string;
  replaceWith: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  type: 'llm' | 'brand' | 'fact' | 'grammar' | 'spelling';
  contextBefore: string;
  contextAfter: string;
  anchorText: string;
  createdAt: number;
}
```

## Configuration

### Environment Variables

The service can be configured with environment variables:

```typescript
const config = {
  baseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
  getAuthToken: async () => {
    // Your authentication logic
  }
};
```

### Development vs Production

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const config = {
  baseUrl: isDevelopment
    ? 'http://localhost:3000'
    : 'https://api.yourdomain.com',
  getAuthToken: async () => {
    if (isDevelopment) {
      return 'dev-token';
    }
    // Production Cognito logic
    return await getCognitoToken();
  }
};
```

## Best Practices

1. **Keep It Simple**: Initialize the API service once at app startup
2. **Use Hooks**: Prefer the provided React hooks for component integration
3. **Handle Errors**: Always show users what went wrong in plain English
4. **Manual Testing**: Test in the browser - it's faster and more reliable than unit tests
5. **Type Safety**: Use TypeScript interfaces, but don't over-engineer types
6. **Progressive Enhancement**: Start with basic functionality, add features as needed
