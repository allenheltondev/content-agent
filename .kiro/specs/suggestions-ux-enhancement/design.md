# Design Document

## Overview

This design transforms the suggestions user experience from a cluttered, confusing interface into a streamlined, professional system that helps writers improve their content efficiently. The solution focuses on visual highlighting in the editor, compact suggestion organization, prominent summary display, clear terminology, professional UI elements, and robust API integration.

## Architecture

### Enhanced Editor Architecture
```
EditorPage (enhanced)
├── ContentSummary (repositioned above content)
├── ContentEditorWithSuggestions (enhanced highlighting)
│   ├── SuggestionHighlightOverlay (new)
│   └── ContentEditor (existing)
├── CompactSuggestionsPanel (redesigned)
│   ├── SuggestionItem (compact by default)
│   └── SuggestionActions (professional styling)
└── SuggestionManager (enhanced API integration)
```

### Visual Highlighting System
```
SuggestionHighlightOverlay
├── HighlightRenderer (color-coded by type)
├── TooltipManager (hover previews)
├── ClickHandler (expand corresponding suggestion)
└── PositionTracker (sync with content changes)
```

### Compact Suggestions Architecture
```
CompactSuggestionsPanel
├── SuggestionSorter (by content position)
├── CompactSuggestionItem (minimized by default)
├── ExpandableDetails (click to expand)
└── ProfessionalActions (compact buttons)
```

## Components and Interfaces

### Enhanced SuggestionHighlightOverlay
```typescript
interface SuggestionHighlightOverlayProps {
  suggestions: Suggestion[];
  content: string;
  onSuggestionClick: (suggestionId: string) => void;
  className?: string;
}

interface HighlightStyle {
  backgroundColor: string;
  borderColor: string;
  opacity: number;
  zIndex: number;
}

interface HighlightPosition {
  startOffser;
  endOffset: number;
  top: number;
  left: number;
  width: number;
  height: number;
}
```

**Responsibilities:**
- Render color-coded highlights for each suggestion type
- Handle overlapping suggestions with visual priority
- Provide hover tooltips with suggestion previews
- Sync highlight positions with content changes
- Handle click events to expand corresponding suggestions

### Redesigned CompactSuggestionsPanel
```typescript
interface CompactSuggestionsPanelProps {
  suggestions: Suggestion[];
  content: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  expandedSuggestion?: string;
  onExpandSuggestion: (id: string | null) => void;
  isLoading?: boolean;
  className?: string;
}

interface CompactSuggestionItemProps {
  suggestion: Suggestion;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAccept: () => void;
  onReject: () => void;
  onDelete: () => void;
  isProcessing: boolean;
}
```

**Responsibilities:**
- Display suggestions sorted by content position
- Show compact view by default with essential information only
- Expand to full details when clicked anywhere on item
- Use professional, compact action buttons
- Remove position information from expanded view
- Eliminate type-based grouping

### Enhanced ContentSummary
```typescript
interface EnhancedContentSummaryProps {
  summary?: string;
  isLoading?: boolean;
  className?: string;
  position: 'above-content' | 'sidebar';
  prominence: 'high' | 'medium' | 'low';
}

interface SummaryDisplayConfig {
  showIcon: boolean;
  fontSize: 'sm' | 'base' | 'lg';
  padding: 'compact' | 'normal' | 'spacious';
  backgroundColor: string;
  borderStyle: string;
}
```

**Responsibilities:**
- Display prominently above main content area
- Use larger, more visible styling
- Provide clear visual hierarchy
- Update dynamically with content changes
- Hide gracefully when no summary available

### Professional SuggestionActions
```typescript
interface ProfessionalSuggestionActionsProps {
  suggestionId: string;
  onAccept: () => void;
  onReject: () => void;
  onDelete: () => void;
  isProcessing: boolean;
  size: 'compact' | 'normal';
  variant: 'professional' | 'minimal';
}

interface ActionButtonConfig {
  size: {
    height: string;
    padding: string;
    fontSize: string;
  };
  colors: {
    accept: string;
    reject: string;
    delete: string;
  };
  spacing: string;
}
```

**Responsibilities:**
- Render appropriately sized, professional buttons
- Provide clear visual feedback on hover/click
- Handle loading states during API calls
- Maintain consistent styling across the application
- Support both compact and normal sizes

### Enhanced SuggestionManager
```typescript
interface EnhancedSuggestionManagerConfig {
  postId: string;
  maxUndoHistory: number;
  persistState: boolean;
  autoSaveOnAccept: boolean;
  apiErrorRetry: boolean;
  postIdValidation: boolean;
}

interface SuggestionApiCall {
  suggestionId: string;
  postId: string;
  action: 'accept' | 'reject' | 'delete';
  timestamp: number;
  retryCount: number;
}
```

**Responsibilities:**
- Ensure post ID is correctly passed to all API calls
- Implement robust error handling with user-friendly messages
- Provide retry mechanisms for failed API calls
- Validate post context before making API calls
- Track API call success/failure for debugging

## Data Models

### Suggestion Highlighting Model
```typescript
interface SuggestionHighlight {
  suggestionId: string;
  type: SuggestionType;
  startOffset: number;
  endOffset: number;
  color: HighlightStyle;
  priority: number;
  isVisible: boolean;
  tooltip?: string;
}

interface HighlightOverlapResolution {
  primarySuggestion: string;
  overlappingSuggestions: string[];
  displayStrategy: 'layered' | 'combined' | 'priority';
}
```

### Compact Suggestion Display Model
```typescript
interface CompactSuggestionDisplay {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  briefPreview: string;
  position: number;
  isExpanded: boolean;
  colors: SuggestionColors;
  actions: SuggestionActions;
}

interface SuggestionSortOrder {
  sortBy: 'position' | 'priority' | 'type';
  direction: 'asc' | 'desc';
  grouping: 'none' | 'type' | 'priority';
}
```

### Enhanced Summary Model
```typescript
interface EnhancedSummaryDisplay {
  content: string;
  position: 'above-content' | 'sidebar';
  prominence: 'high' | 'medium' | 'low';
  styling: SummaryDisplayConfig;
  isVisible: boolean;
  lastUpdated: number;
}
```

### API Integration Model
```typescript
interface SuggestionApiContext {
  postId: string;
  sessionId?: string;
  userId?: string;
  timestamp: number;
  retryAttempts: number;
  lastError?: string;
}

interface ApiCallResult {
  success: boolean;
  error?: string;
  retryable: boolean;
  userMessage: string;
  debugInfo?: any;
}
```

## Error Handling

### Visual Highlighting Error Recovery
- Handle content changes that invalidate highlight positions
- Gracefully degrade when overlapping suggestions can't be resolved
- Provide fallback display when color-coding fails
- Recover from tooltip rendering errors
- Handle click events on invalid suggestions

### Compact Display Error States
- Show loading states for individual suggestions
- Handle expansion failures gracefully
- Provide fallback content when suggestion data is incomplete
- Recover from sorting/filtering errors
- Display appropriate messages for empty states

### Summary Display Error Handling
- Handle missing or corrupted summary data
- Provide loading states during summary generation
- Gracefully hide when positioning fails
- Handle dynamic content updates that affect summary
- Recover from styling/layout errors

### API Integration Error Recovery
- Implement comprehensive post ID validation
- Provide clear error messages for API failures
- Implement automatic retry with exponential backoff
- Handle network failures gracefully
- Validate suggestion context before API calls
- Provide user-friendly error messages for all failure scenarios

## Testing Strategy

### Visual Highlighting Testing
- Test highlight rendering with various suggestion types
- Test overlapping suggestion handling
- Test highlight position updates with content changes
- Test tooltip display and interaction
- Test click-to-expand functionality

### Compact Display Testing
- Test suggestion sorting by content position
- Test expand/collapse functionality
- Test compact vs expanded view rendering
- Test professional button styling and interaction
- Test loading states and error handling

### Summary Positioning Testing
- Test summary display above content area
- Test responsive behavior across screen sizes
- Test summary updates with content changes
- Test visibility states and transitions
- Test integration with existing layout

### API Integration Testing
- Test post ID propagation to all API calls
- Test error handling for various API failure scenarios
- Test retry mechanisms and user feedback
- Test suggestion action success/failure flows
- Test concurrent suggestion actions

### Manual Testing Scenarios
- Complete suggestion workflow from highlight to action
- Multi-suggestion interaction and management
- Summary display and content relationship
- Professional UI appearance and behavior
- Error recovery and user experience

## Implementation Approach

### Phase 1: Visual Highlighting System
1. Create SuggestionHighlightOverlay component
2. Implement color-coded highlighting by suggestion type
3. Add hover tooltips with suggestion previews
4. Implement click-to-expand functionality
5. Handle overlapping suggestions with visual priority

### Phase 2: Compact Suggestions Panel
1. Redesign SuggestionsPanel for compact display
2. Implement sorting by content position
3. Create compact suggestion item component
4. Add click-anywhere-to-expand functionality
5. Remove position information from expanded view
6. Eliminate type-based grouping

### Phase 3: Summary Repositioning
1. Move ContentSummary above main content area
2. Enhance visual prominence and styling
3. Improve responsive behavior
4. Add dynamic content update handling
5. Implement graceful hiding for missing summaries

### Phase 4: Professional UI Polish
1. Redesign suggestion action buttons for professional appearance
2. Update terminology from "AI Suggestions" to "Writing Improvements"
3. Implement consistent sizing and spacing
4. Add proper hover and focus states
5. Ensure accessibility compliance

### Phase 5: API Integration Enhancement
1. Implement robust post ID validation and propagation
2. Add comprehensive error handling with user-friendly messages
3. Implement retry mechanisms for failed API calls
4. Add success/failure feedback for all actions
5. Validate suggestion context before API calls

### Phase 6: Integration and Polish
1. Integrate all components in EditorPage
2. Test complete suggestion workflow
3. Optimize performance and responsiveness
4. Add comprehensive error recovery
5. Implement final UI polish and accessibility improvements

## Performance Considerations

### Highlighting Performance
- Use efficient DOM manipulation for highlight rendering
- Implement virtual scrolling for large content
- Optimize highlight position calculations
- Cache highlight styles and positions
- Debounce content change updates

### Compact Display Performance
- Implement virtualization for large suggestion lists
- Optimize sorting and filtering operations
- Cache expanded/collapsed states
- Minimize re-renders during interactions
- Use efficient state management

### Summary Display Performance
- Cache summary content and styling
- Optimize positioning calculations
- Minimize layout shifts during updates
- Use efficient responsive design patterns
- Implement smooth transitions

### API Performance
- Implement request deduplication
- Use efficient error handling patterns
- Optimize retry mechanisms
- Cache API responses where appropriate
- Minimize unnecessary API calls

## Accessibility Considerations

### Visual Highlighting Accessibility
- Provide alternative text for color-coded highlights
- Ensure sufficient color contrast for all suggestion types
- Support keyboard navigation for highlighted text
- Provide screen reader announcements for highlights
- Implement focus management for click-to-expand

### Compact Display Accessibility
- Ensure proper heading hierarchy
- Provide keyboard navigation for suggestion items
- Implement proper ARIA labels and descriptions
- Support screen reader navigation
- Ensure focus management during expand/collapse

### Summary Display Accessibility
- Use proper semantic markup for summary content
- Provide appropriate ARIA labels
- Ensure summary is discoverable by screen readers
- Implement proper focus management
- Support keyboard navigation

### Professional UI Accessibility
- Ensure all buttons meet minimum size requirements
- Provide proper focus indicators
- Implement keyboard shortcuts where appropriate
- Use semantic HTML elements
- Provide alternative text for icons and visual elements
