# Design Document

## Overview

This design addresses four critical improvements to the blog editor component:
1. Proper draft management with intelligent cleanup and conflict detection
2. Addition of title and description fields to the editor interface
3. Consolidation of async review functionality with real-time feedback
4. Simplified integration with the updated review endpoint response format

The design maintains the existing architecture while enhancing user experience and reducing complexity.

## Architecture

### Current State Analysis

The blog editor currently uses:
- `EditorPage.tsx` as the main container component
- `useDraftPersistence` hook for local storage management
- `useAsyncReview` hook for review functionality
- `EditorHeader` component for title editing
- `ContentEditor` component for body content

### Proposed Changes

#### 1. Enhanced Draft Management
- Modify `useDraftPersistence` to include content comparison logic
- Add draft cleanup on successful save operations
- Implement intelligent draft dialog display based on content matching



#### 2. Consolidated Review System
- Remove separate "Async Review" functionality
- Enhance "Submit for Review" to handle both immediate and async review
- Implement automatic page scroll to top after review submission
- Add real-time feedback through long polling integration

#### 3. Simplified API Integration
- Update review service to handle new response format (token + endpoint)
- Modify long polling setup to use provided endpoint directly

## Components and Interfaces

### Modified Components

#### EditorPage State Updates
```typescript
// Update draft persistence with improved comparison
const { loadDraft, clearDraft } = useDraftPersistence({
  postId: id || '',
  title,
  content,
  enabled: !!id && !isNewPost
});
```

### Enhanced Hooks

#### useDraftPersistence Hook
```typescript
interface DraftData {
  title: string;
  content: string;
  timestamp: number;
}

interface UseDraftPersistenceOptions {
  postId: string;
  title: string;
  content: string;
  enabled?: boolean;
  debounceMs?: number;
}

// Add content comparison method
const isDraftDifferent = (draft: DraftData, current: { title: string; content: string }): boolean => {
  return draft.title !== current.title ||
         draft.content !== current.content;
};
```

#### useAsyncReview Hook Updates
```typescript
interface StartReviewResponse {
  token: string; // UPDATED: simplified from momentoToken
  endpoint: string; // UPDATED: simplified from subscribeUrl
  reviewId: string;
}

// Update startReview method to handle new response format
const startReview = useCallback(async (postId: string): Promise<void> => {
  // ... existing logic ...

  const reviewResponse: StartReviewResponse = await reviewService.startReview(postId);

  // Use simplified response format
  const cleanup = await reviewService.subscribeToReviewUpdates(
    reviewResponse.token,    // Direct token access
    reviewResponse.endpoint, // Direct endpoint access
    handleReviewMessage,
    handlePollingError
  );

  // Scroll to top after starting review
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // ... rest of logic ...
}, []);
```

## Data Models

### Draft Storage Format
```typescript
interface LocalDraftData {
  title: string;
  content: string;
  timestamp: number;
  postId: string;
}
```

## Error Handling

### Draft Management Errors
- Handle localStorage quota exceeded gracefully
- Provide fallback when draft parsing fails
- Show user-friendly messages for draft conflicts

### Review Process Errors
- Maintain existing error handling patterns
- Add specific handling for token/endpoint format changes
- Provide clear feedback when review fails to start

### Validation Errors
- Maintain existing title and content validation
- Show inline validation messages

## Testing Strategy

### Unit Testing Focus
- Test draft comparison logic in `useDraftPersistence`
- Test review response format handling
- Test draft cleanup on save operations

### Integration Testing
- Test complete save flow with description field
- Test draft recovery with description data
- Test consolidated review flow from start to completion
- Test page scroll behavior after review submission

### Manual Testing Scenarios
1. **Draft Management**
   - Create draft, save post, verify draft is cleared
   - Load post with matching draft, verify no dialog shown
   - Load post with different draft, verify dialog shown with correct options

2. **Consolidated Review**
   - Submit for review, verify single action triggers both API call and polling
   - Verify page scrolls to top after submission
   - Test review completion notifications and suggestion refresh

4. **Error Scenarios**
   - Test review failure handling
   - Test localStorage errors
   - Test network failures during review polling

## Implementation Approach

### Phase 1: Draft Management Enhancement
1. Update `useDraftPersistence` hook with content comparison
2. Modify draft cleanup logic in save operations
3. Update draft dialog display logic

### Phase 2: Review System Consolidation
1. Remove separate async review button/functionality
2. Update "Submit for Review" to handle new response format
3. Add automatic page scroll after review submission
4. Update review service to use simplified token/endpoint format

### Phase 3: Testing and Refinement
1. Implement comprehensive testing
2. Handle edge cases and error scenarios
3. Optimize user experience based on testing feedback

## Migration Considerations

### Data Migration
- Local storage drafts will be updated incrementally as users edit posts
- Old draft format will be handled with fallback values

### API Compatibility
- Review endpoint response format change requires coordinated deployment
- Frontend must handle both old and new response formats during transition
- Graceful degradation if new fields are missing
