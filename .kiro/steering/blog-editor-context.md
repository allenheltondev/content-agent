---
inclusion: fileMatch
fileMatchPattern: '**/blog-editor-ui/**'
---

# Blog Editor UI Context

## Project Overview
This is a React-based blog writing application for drafting and editing blog posts with AI-powered suggestions. The frontend is decoupled from the AWS Lambda backend and communicates via REST APIs.

## Key Features
- Amazon Cognito authentication
- Real-time blog post editing with auto-save
- AI-powered suggestions with visual highlighting
- One-click accept/reject suggestion workflow
- Post status management (draft, review, finalized)

## Backend Integration Points

### Existing Backend Structure
The backend uses AWS Lambda functions with DynamoDB for data storage. Key components:

#### Content Structure
```javascript
// Blog post data structure in DynamoDB
{
  pk: `${tenantId}#${contentId}`,
  sk: 'content',
  title: string,
  body: string,
  status: 'draft' | 'review' | 'finalized' | 'published' | 'abandoned',
  version: number,
  createdAt: number,
  updatedAt: number
}
```

#### Suggestion Structure
```javascript
// Suggestion data structure from create-suggestions.mjs
{
  pk: `${tenantId}#${contentId}`,
  sk: `suggestion#${id}`,
  startOffset: number,
  endOffset: number,
  textToReplace: string,
  replaceWith: string,
  reason: string,
  priority: 'low' | 'medium' | 'high',
  type: 'llm' | 'brand' | 'fact' | 'grammar' | 'spelling',
  contextBefore: string,
  contextAfter: string,
  anchorText: string,
  createdAt: number,
  ttl: number
}
```

## Required REST API Endpoints
The frontend expects these REST endpoints to be implemented:

- `GET /api/posts` - List user's blog posts
- `GET /api/posts/{id}` - Get specific blog post
- `POST /api/posts` - Create new blog post
- `PUT /api/posts/{id}` - Update existing blog post
- `GET /api/posts/{id}/suggestions` - Get suggestions for a post
- `DELETE /api/suggestions/{id}` - Delete a suggestion
- `POST /api/posts/{id}/submit-review` - Submit post for additional review
- `POST /api/posts/{id}/finalize` - Finalize the draft

## Frontend Architecture Decisions

### Technology Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling
- **AWS Amplify Auth** for Cognito integration
- **React Query** for server state management

### Component Architecture
```
App
├── AuthProvider (Cognito integration)
├── Router
│   ├── LoginPage
│   ├── DashboardPage
│   │   └── PostList
│   └── EditorPage
│       ├── EditorHeader
│       ├── ContentEditor
│       │   ├── TextEditor
│       │   └── SuggestionOverlay
│       └── EditorActions
```

### State Management Strategy
- **Authentication**: React Context with Cognito
- **Server State**: React Query for API data
- **Local State**: React hooks for component state
- **Persistence**: Local storage for draft backup

## Suggestion Highlighting System

### Visual Design
Each suggestion type has a distinct color scheme:
- **LLM**: Blue highlighting (`bg-blue-200 border-blue-400`)
- **Brand**: Purple highlighting (`bg-purple-200 border-purple-400`)
- **Fact**: Orange highlighting (`bg-orange-200 border-orange-400`)
- **Grammar**: Green highlighting (`bg-green-200 border-green-400`)
- **Spelling**: Red highlighting (`bg-red-200 border-red-400`)

### Interaction Flow
1. Suggestions are loaded when editing existing posts
2. Text is highlighted based on startOffset/endOffset
3. Hover shows suggestion details and action buttons
4. Accept applies change locally and removes highlight
5. Reject removes suggestion from UI and deletes from backend

## Development Guidelines

### Hackathon Considerations
- Keep implementation simple and maintainable
- Focus on core functionality first
- Use established patterns and libraries
- Prioritize working features over perfect code

### Code Organization
- Separate concerns: components, services, types, utilities
- Use TypeScript interfaces for all data structures
- Implement proper error handling and loading states
- Write clean, readable code with good naming conventions

### Testing Strategy
- Unit tests for utility functions and services
- Component tests for critical user interactions
- Integration tests for suggestion workflow
- E2E tests for complete user journeys

## Performance Considerations
- Implement auto-save with debouncing
- Use React.memo for expensive components
- Lazy load route components
- Optimize suggestion highlighting for large documents
- Cache API responses appropriately
