# Project Standards and Conventions

## Core Development Principles

### Simplicity Above All Else
- **ALWAYS choose the simplest solution that works**
- Avoid over-engineering - build only what you need right now
- Prefer straightforward, readable code over clever optimizations
- Use intuitive variable names that eliminate the need for comments
- Keep components small and focused on a single responsibility
- Minimize dependencies - use built-in browser APIs when possible
- Make the UX so intuitive that users never need instructions

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

### Frontend Simplicity Principles
- **Build the minimum viable feature first** - you can always add complexity later
- **One component, one purpose** - if a component does multiple things, split it
- **Inline simple logic** - don't extract every piece of logic into separate functions
- **Use standard HTML elements** when possible instead of custom components
- **Avoid abstractions until you have 3+ similar use cases**
- **Prefer explicit code over magic** - it's easier to debug and maintain
- **Delete code aggressively** - unused code is a liability

### React Component Structure - Keep It Simple
- Use functional components with hooks - avoid class components entirely
- Keep components small (under 100 lines when possible)
- Use TypeScript interfaces for props, but don't over-type internal state
- Prefer local state over global state - only use Context for truly global data
- Implement error boundaries only where absolutely necessary
- Avoid complex state management patterns - useState and useEffect cover 90% of needs

### API Integration - Simple and Predictable
- Follow REST conventions: GET /posts, POST /posts, PUT /posts/:id, DELETE /posts/:id
- Use endpoint names that match user mental models (not technical jargon)
- Create one simple service class for API communication - avoid multiple layers
- Keep error handling simple - show users what went wrong in plain English
- Use loading states everywhere - users should never wonder if something is working
- Only cache when absolutely necessary - prefer fresh data over complexity

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

### Backend Testing Only
- **Frontend unit tests are NOT required** - they go stale quickly and slow down iteration
- Focus testing efforts on backend Lambda functions and business logic
- Write tests for utility functions and AWS integrations
- Mock external dependencies (AWS services, APIs)
- Use descriptive test names that explain the scenario
- Aim for high test coverage on backend business logic only

### Frontend Testing Philosophy
- **Manual testing is preferred** for UI components and user workflows
- Test in the browser during development - it's faster and more reliable
- Use browser dev tools to verify functionality
- Focus on user experience over test coverage
- Only write frontend tests for complex business logic (rare in UI components)

## Performance Guidelines

### Backend Optimization
- Use connection reuse for AWS services
- Implement proper timeout and memory settings
- Use efficient DynamoDB query patterns
- Cache frequently accessed data

### Frontend Optimization - Only When Needed
- **Don't optimize prematurely** - build it simple first, optimize only if there's a real performance problem
- Use code splitting only for large route-level components
- Avoid complex state management libraries unless absolutely necessary
- Use React.memo sparingly - only for expensive components that re-render frequently
- Prefer simple fetch() over heavy HTTP client libraries
- Keep bundle size reasonable, but don't obsess over every kilobyte

## Error Handling Standards

### Backend Error Handling
- Log errors with appropriate context
- Return user-friendly error messages
- Implement proper HTTP status codes
- Use structured error responses

### Frontend Error Handling - Simple and User-Focused
- **Keep error handling simple** - don't build complex error management systems
- Show error messages in plain English that users can understand
- Provide simple retry buttons for failed operations
- Handle network failures with clear "try again" messaging
- Use error states that tell users exactly what to do next
- Avoid technical error codes or stack traces in the UI
