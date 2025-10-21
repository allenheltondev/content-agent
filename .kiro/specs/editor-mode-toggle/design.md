# Design Document

## Overview

This design implements an Edit/Review mode toggle system that addresses the critical UX issue where users cannot edit content when suggestions are displayed. The solution introduces a clear mode separation that allows users to focus on either content creation (Edit mode) or suggestion review (Review mode) without interference. The design includes intelligent suggestion recalculation when content changes and smooth transitions between modes.

## Architecture

### Mode Management Architecture
```
EditorModeProvider
├── ModeToggleButton
├── ContentEditorWithSuggestions (mode-aware)
├── SuggestionRecalculationService
└── ModeTransitionManager
```

### State Management Strategy
```
EditorMode State
├── currentMode: 'edit' | 'review'
├── isTransitioning: boolean
├── pendingRecalculation: boolean
├── lastEditTimestamp: number
└── suggestionVersion: number
```

### Suggestion Lifecycle Management
```
Content Change Detection
├── Track content modifications in Edit mode
├── Calculate content diff on mode switch
├── Trigger suggestion recalculation
├── Update suggestion positions
└── Handle suggestion invalidation
```

## Components and Interfaces

### EditorModeProvider Context
```typescript
interface EditorModeContextType {
  // Current state
  currentMode: 'edit' | 'review';
  isTransitioning: boolean;
  pendingRecalculation: boolean;

  // Mode switching
  switchToEditMode: () => void;
  switchToReviewMode: () => Promise<void>;

  // Content tracking
  markCod: () => void;
  getContentChangesSinceLastReview: () => ContentDiff[];

  // Suggestion management
  recalculateSuggestions: () => Promise<void>;
  getSuggestionVersion: () => number;
}
```

**Responsibilities:**
- Manage current editor mode state
- Handle mode transitions with loading states
- Track content changes for suggestion recalculation
- Coordinate with suggestion manager for updates
- Provide mode-aware rendering context

### ModeToggleButton Component
```typescript
interface ModeToggleButtonProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  disabled?: boolean;
}

interface ModeToggleState {
  currentMode: 'edit' | 'review';
  isTransitioning: boolean;
  pendingRecalculation: boolean;
  hasContentChanges: boolean;
}
```

**Responsibilities:**
- Render toggle button with clear mode indicators
- Show loading state during transitions
- Display tooltips explaining mode functionality
- Handle keyboard navigation and accessibility
- Provide visual feedback for mode changes

### Enhanced ContentEditorWithSuggestions
```typescript
interface ContentEditorWithSuggestionsProps {
  // Existing props
  content: string;
  suggestions: Suggestion[];
  onChange: (content: string) => void;
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;

  // New mode-aware props
  editorMode: 'edit' | 'review';
  isTransitioning: boolean;
  onModeChange?: (mode: 'edit' | 'review') => void;

  // Enhanced suggestion props
  suggestionVersion: number;
  onSuggestionRecalculation?: () => Promise<void>;
}
```

**Responsibilities:**
- Render differently based on current mode
- Hide/show suggestions based on mode
- Disable editing in Review mode
- Handle smooth transitions between modes
- Trigger suggestion recalculation when needed

### SuggestionRecalculationService
```typescript
interface SuggestionRecalculationService {
  // Content tracking
  trackContentChange: (oldContent: string, newContent: string) => ContentDiff;
  calculatePositionDeltas: (diffs: ContentDiff[], suggestions: Suggestion[]) => SuggestionDelta[];

  // Suggestion updates
  recalculateSuggestionPositions: (suggestions: Suggestion[], deltas: SuggestionDelta[]) => Suggestion[];
  invalidateOverlappingSuggestions: (suggestions: Suggestion[], changedRanges: ContentRange[]) => Suggestion[];

  // API integration
  requestNewSuggestions: (postId: string, changedContent: string) => Promise<Suggestion[]>;
  mergeSuggestionSets: (existing: Suggestion[], newSuggestions: Suggestion[]) => Suggestion[];
}
```

**Responsibilities:**
- Track content changes between Edit and Review modes
- Calculate how content changes affect suggestion positions
- Update existing suggestion positions based on content changes
- Remove suggestions that are no longer valid
- Request new suggestions for modified content areas
- Merge new suggestions with existing ones

### ModeTransitionManager
```typescript
interface ModeTransitionManager {
  // Transition coordination
  beginTransition: (fromMode: 'edit' | 'review', toMode: 'edit' | 'review') => Promise<void>;
  handleEditToReview: (content: string, suggestions: Suggestion[]) => Promise<TransitionResult>;
  handleReviewToEdit: () => Promise<TransitionResult>;

  // Loading states
  setTransitionLoading: (loading: boolean) => void;
  getTransitionProgress: () => TransitionProgress;
}

interface TransitionResult {
  success: boolean;
  updatedSuggestions?: Suggestion[];
  error?: string;
  requiresUserAction?: boolean;
}
```

**Responsibilities:**
- Coordinate smooth transitions between modes
- Handle loading states during transitions
- Manage suggestion recalculation during Edit→Review transition
- Provide error handling for failed transitions
- Ensure UI remains responsive during transitions

## Data Models

### Editor Mode State
```typescript
interface EditorModeState {
  currentMode: 'edit' | 'review';
  isTransitioning: boolean;
  transitionStartTime: number | null;
  lastModeSwitch: number;

  // Content tracking
  contentAtLastReview: string;
  contentChangesSinceReview: ContentDiff[];
  lastEditTimestamp: number;

  // Suggestion management
  suggestionVersion: number;
  pendingRecalculation: boolean;
  recalculationInProgress: boolean;
}
```

### Content Diff Model
```typescript
interface ContentDiff {
  type: 'insert' | 'delete' | 'replace';
  startOffset: number;
  endOffset: number;
  oldText: string;
  newText: string;
  timestamp: number;
}

interface ContentRange {
  startOffset: number;
  endOffset: number;
}
```

### Suggestion Delta Model
```typescript
interface SuggestionDelta {
  suggestionId: string;
  oldStartOffset: number;
  oldEndOffset: number;
  newStartOffset: number;
  newEndOffset: number;
  isValid: boolean;
  requiresUpdate: boolean;
}
```

### Mode Toggle UI State
```typescript
interface ModeToggleUIState {
  currentMode: 'edit' | 'review';
  isHovered: boolean;
  isFocused: boolean;
  isPressed: boolean;
  showTooltip: boolean;
  tooltipContent: string;
  isDisabled: boolean;
  hasContentChanges: boolean;
}
```

## Error Handling

### Mode Transition Errors
- Handle suggestion recalculation failures gracefully
- Provide fallback when API requests fail
- Show clear error messages for transition failures
- Allow users to retry failed transitions
- Maintain editor functionality even if mode switching fails

### Content Synchronization Errors
- Handle cases where content changes can't be tracked
- Provide recovery when suggestion positions become invalid
- Show warnings when suggestions may be outdated
- Allow manual suggestion refresh
- Prevent data loss during mode transitions

### API Integration Errors
- Handle suggestion API failures during recalculation
- Provide offline mode when suggestion service is unavailable
- Show loading states for long-running recalculations
- Allow cancellation of in-progress recalculations
- Cache suggestions to reduce API dependency

### User Experience Errors
- Prevent mode switching during active editing
- Handle rapid mode switching gracefully
- Provide clear feedback when transitions are blocked
- Show progress indicators for long operations
- Maintain keyboard navigation during errors

## Testing Strategy

### Mode Toggle Functionality
- Test mode switching with keyboard and mouse
- Verify visual indicators for each mode
- Test accessibility compliance (ARIA labels, focus management)
- Validate tooltip behavior and content
- Test disabled states and error conditions

### Content Editor Mode Behavior
- Test editing functionality in Edit mode
- Verify suggestion display in Review mode
- Test content preservation during mode switches
- Validate suggestion interaction in Review mode
- Test responsive behavior across screen sizes

### Suggestion Recalculation
- Test position updates after content changes
- Verify suggestion invalidation for overlapping changes
- Test new suggestion generation for modified content
- Validate suggestion merging logic
- Test error handling for failed recalculations

### Performance Testing
- Measure mode transition times
- Test with large documents and many suggestions
- Validate memory usage during recalculations
- Test suggestion rendering performance
- Measure impact on typing performance in Edit mode

## Implementation Approach

### Phase 1: Core Mode Toggle Infrastructure
1. Create EditorModeProvider context with basic state management
2. Implement ModeToggleButton component with visual indicators
3. Add mode-aware rendering to ContentEditorWithSuggestions
4. Implement basic mode switching without suggestion recalculation

### Phase 2: Content Change Tracking
1. Implement content diff calculation system
2. Add content change tracking in Edit mode
3. Create suggestion position delta calculation
4. Implement suggestion invalidation logic

### Phase 3: Suggestion Recalculation System
1. Build SuggestionRecalculationService
2. Integrate with existing suggestion API
3. Implement suggestion position updates
4. Add new suggestion generation for changed content

### Phase 4: Transition Management and Polish
1. Create ModeTransitionManager for smooth transitions
2. Add loading states and progress indicators
3. Implement error handling and recovery
4. Add keyboard shortcuts and accessibility features

### Phase 5: Performance Optimization and Testing
1. Optimize suggestion recalculation performance
2. Add caching for suggestion position calculations
3. Implement debouncing for rapid mode switches
4. Add comprehensive error handling and user feedback

## Performance Considerations

### Mode Switching Performance
- Debounce rapid mode switches to prevent excessive API calls
- Cache suggestion position calculations to avoid recalculation
- Use React.memo and useMemo to prevent unnecessary re-renders
- Implement lazy loading for suggestion recalculation

### Content Change Tracking
- Use efficient diff algorithms for large documents
- Batch content changes to reduce calculation overhead
- Implement incremental position updates instead of full recalculation
- Cache content diffs to avoid repeated calculations

### Suggestion Management
- Implement virtual scrolling for large suggestion lists
- Use suggestion pooling to reduce memory allocation
- Batch suggestion API requests to reduce network overhead
- Implement suggestion caching with intelligent invalidation

### UI Responsiveness
- Use CSS transitions for smooth mode switching animations
- Implement skeleton loading states for suggestion recalculation
- Ensure editor remains responsive during background operations
- Use Web Workers for heavy suggestion calculations if needed

## Accessibility Considerations

### Keyboard Navigation
- Ensure mode toggle is accessible via Tab navigation
- Implement Enter/Space activation for mode toggle
- Provide keyboard shortcuts for quick mode switching (Ctrl+M)
- Maintain focus management during mode transitions

### Screen Reader Support
- Add ARIA labels for mode toggle button
- Announce mode changes to screen readers
- Provide descriptive text for current mode state
- Ensure suggestion interactions are accessible in Review mode

### Visual Accessibility
- Provide high contrast mode indicators
- Ensure sufficient color contrast for all mode states
- Add visual focus indicators for keyboard navigation
- Support reduced motion preferences for transitions

### Cognitive Accessibility
- Use clear, consistent language for mode descriptions
- Provide helpful tooltips explaining mode functionality
- Show clear visual feedback for all user actions
- Implement undo functionality for accidental mode switches
