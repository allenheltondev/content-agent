# Project Standards and Conventions

## Core Development Principles

### Simplicity First
- Always choose simplicity over complexity
- Favor intuitive variable names over comments
- Use REST guidelines for API endpoints
- Make the UX as intuitive as possible

## Code Style and Structure

### JavaScript/TypeScript Patterns
- Use ES6+ modules with `.mjs` extension for Node.js backend files
- Use TypeScript for React frontend with strict type checking
- Prefer `const` and `let` over `var`
- Use descriptive variable names that explain purpose without comments
- Use destructuring for object and array assignments
- Implement proper error handling with try-catch blocks

### AWS SDK Usage
- Always use v3 AWS SDK with modular imports
- Use `marshall`/`unmarshall` for DynamoDB data transformation
- Implement proper error handling for AWS service calls
- Use environment variables for configuration (TABLE_NAME, MEMORY_PARAMETER, etc.)

### Backend Function Structure
```javascript
// Standard Lambda handler pattern
export const handler = async (event) => {
  try {
    const { tenantId, sessionId, contentId } = event;
    // Implementation
    return response;
  } catch (err) {
    console.error(err);
    // Return appropriate error response
  }
};
```

### Tool Definition Pattern
```javascript
export const toolName = {
  name: 'toolName',
  description: 'Clear description of what the tool does',
  schema: z.object({
    // Zod schema definition
  }),
  handler: async (tenantId, input) => {
    // Tool implementation
  }
};
```

## Security Guidelines

### Authentication and Authorization
- Never allow LLMs to provide tenant IDs - always infer from context
- Use Amazon Cognito for frontend authentication
- Include JWT tokens in all API requests
- Validate user permissions before data access

### Data Handling
- Always validate input using Zod schemas
- Sanitize user input before processing
- Use parameterized queries for database operations
- Implement proper error messages without exposing sensitive data

## Frontend Development Standards

### React Component Structure
- Use functional components with hooks
- Implement TypeScript interfaces for all props and state
- Use React Context for global state management
- Implement proper error boundaries

### API Integration
- Follow REST conventions: GET /posts, POST /posts, PUT /posts/:id, DELETE /posts/:id
- Use intuitive endpoint names that match user mental models
- Create dedicated service classes for API communication
- Implement retry logic with exponential backoff
- Use proper loading states and error handling
- Cache API responses where appropriate

### Styling Guidelines
- Use Tailwind CSS utility classes
- Implement responsive design mobile-first
- Design for intuitive user experience - users should understand actions without explanation
- Use visual hierarchy to guide user attention
- Provide immediate feedback for all user actions
- Use consistent color scheme for suggestion types:
  - LLM: Blue (`bg-blue-200 border-blue-400`)
  - Brand: Purple (`bg-purple-200 border-purple-400`)
  - Fact: Orange (`bg-orange-200 border-orange-400`)
  - Grammar: Green (`bg-green-200 border-green-400`)
  - Spelling: Red (`bg-red-200 border-red-400`)

## Testing Standards

### Unit Testing
- Write tests for all utility functions and services
- Mock external dependencies (AWS services, APIs)
- Use descriptive test names that explain the scenario
- Aim for high test coverage on business logic

### Integration Testing
- Test complete user workflows
- Mock API responses for different scenarios
- Test error handling and edge cases
- Validate authentication flows

## Performance Guidelines

### Backend Optimization
- Use connection reuse for AWS services
- Implement proper timeout and memory settings
- Use efficient DynamoDB query patterns
- Cache frequently accessed data

### Frontend Optimization
- Implement code splitting and lazy loading
- Use React Query for server state management
- Optimize bundle size with tree shaking
- Implement proper memoization for expensive operations

## Error Handling Standards

### Backend Error Handling
- Log errors with appropriate context
- Return user-friendly error messages
- Implement proper HTTP status codes
- Use structured error responses

### Frontend Error Handling
- Implement global error boundaries
- Show user-friendly error messages in plain language
- Provide retry mechanisms for failed operations
- Handle network failures gracefully
- Use intuitive error states that guide users to resolution
