# Design Document

## Overview

This design transforms the suggestions system from a sidebar listing all suggestions to an "active suggestion area" that focuses on one suggestion at a time. Users interact with suggestions by clicking highlighted text in the content or using navigation controls in the active suggestion panel. This approach reduces cognitive load, emphasizes the content, and provides a cleaner, more focused editing experience.

## Architecture

### Active Suggestion Architecture
```
EditorPage
├── AppHeader (existing)
├── EditorHeader (existing)
├── ContentSummary (above content, existing)
├── ActiveSuggestionArea (new - positioned strategically)
│   ├── SuggestionNavigationControls
│   ├── ActiveSuggestionDisplay
│   └── SuggestionActionButtons
└── ContentEditorWithHighlights (enhanced)
    ├── ContentEditor (existing)
    └── InteractiveSuggestionHighlights (redesigned)
```

### Active Suggestion Management System
```
ActiveSuggestionManager
├── SuggestionStateManager (tracks active suggestion)
├── NavigationController (previous/next logic)
├── HighlightClickHandler (text click interactions)
└── AutoProgressionManager (auto-advance after resolution)
```

### Interactive Highlighting System
```
InteractiveSuggestionHighlights
├── ClickableHighlightRenderer (handles text clicks)
├── ActiveSuggestionHighlighter (distinct active state)
├── SuggestionTextMapper (maps highlights to suggestions)
└── ScrollToActiveManager (auto-scroll to active suggestion)
```

## Components and Interfaces

### ActiveSuggestionArea
```typescript
interface ActiveSuggestionAreaProps {
  activeSuggestion: Suggestion | null;
  totalSuggestions: number;
  currentIndex: number;
  onNavigate: (direction: 'previous' | 'next') => void;
  onAccept: (suggestionId: string, editedText?: string) => void;
  onReject: (suggestionId: string) => void;
  onEdit: (suggestionId: string, newText: string) => void;
  isProcessing: boolean;
  className?: string;
}

interface SuggestionAreaConfig {
  position: 'floating' | 'sidebar' | 'bottom';
  width: string; // '400px' for floating, 'full' for bottom
  maxHeight: string; // '200px'
  offset: {
    top?: string;
    right?: string;
    bottom?: string;
  };
}
```

**Responsibilities:**
- Display only the currently active suggestion
- Provide navigation controls for moving between suggestions
- Handle accept/reject/edit actions for the active suggestion
- Show progress indicator (current/total suggestions)
- Position appropriately to not interfere with content editing

### InteractiveSuggestionHighlights
```typescript
interface InteractiveSuggestionHighlightsProps {
  suggestions: Suggestion[];
  activeSuggestionId: string | null;
  content: string;
  onHighlightClick: (suggestionId: string) => void;
  className?: string;
}

interface HighlightInteractionConfig {
  clickable: boolean; // Always true - highlights are interactive
  activeHighlightStyle: HighlightStyle; // Distinct style for active suggestion
  inactiveHighlightStyle: HighlightStyle; // Style for non-active suggestions
  hoverStyle: HighlightStyle; // Style on hover
}

interface HighlightStyle {
  backgroundColor: string;
  borderColor?: string;
  opacity: number;
  borderRadius: string;
  cursor: 'pointer' | 'default';
  transition: string;
}
```

**Responsibilities:**
- Render clickable highlights for all suggestions
- Provide distinct visual state for the active suggestion
- Handle click events to change active suggestion
- Show hover states for interactive feedback
- Maintain precise highlighting boundaries
- Support overlapping suggestions with click cycling

### ActiveSuggestionManager
```typescript
interface ActiveSuggestionManagerProps {
  suggestions: Suggestion[];
  initialActiveSuggestion?: string;
  onActiveSuggestionChange: (suggestionId: string | null) => void;
  onSuggestionResolved: (suggestionId: string, action: 'accepted' | 'rejected') => void;
  autoAdvance: boolean; // Auto-advance to next suggestion after resolution
}

interface SuggestionNavigationState {
  activeSuggestionId: string | null;
  currentIndex: number;
  totalSuggestions: number;
  hasNext: boolean;
  hasPrevious: boolean;
  availableSuggestions: Suggestion[]; // Unresolved suggestions
}

interface SuggestionResolutionConfig {
  autoAdvanceDelay: number; // 300ms delay before advancing
  scrollToActive: boolean; // Auto-scroll to active suggestion
  showResolutionFeedback: boolean; // Show brief feedback on resolution
}
```

**Responsibilities:**
- Track which suggestion is currently active
- Manage navigation between suggestions (previous/next)
- Handle suggestion resolution and auto-advancement
- Maintain state of available vs resolved suggestions
- Coordinate with highlighting system for active suggestion display
- Provide scroll-to-active functionality

### SuggestionEditingInterface
```typescript
interface SuggestionEditingInterfaceProps {
  suggestion: Suggestion;
  onAccept: (editedText?: string) => void;
  onReject: () => void;
  onTextEdit: (newText: string) => void;
  allowEditing: boolean;
  isProcessing: boolean;
}

interface EditingCapabilities {
  canEditSuggestedText: boolean; // Allow editing before accepting
  showOriginalText: boolean; // Show what will be replaced
  showPreview: boolean; // Show preview of change
  validateEdits: boolean; // Validate edited text
}

interface SuggestionDisplayConfig {
  showType: boolean; // Show suggestion type (grammar, style, etc.)
  showReason: boolean; // Show why suggestion was made
  showContext: boolean; // Show surrounding context
  compactMode: boolean; // Use compact display for space efficiency
}
```

**Responsibilities:**
- Display the active suggestion with full details
- Provide editing interface for modifying suggested text
- Show original text and suggested replacement clearly
- Handle accept/reject actions with optional text editing
- Provide clear visual feedback for user actions
- Support different suggestion types with appropriate interfaces

### Performance-Optimized Highlighting
```typescript
interface HighlightPerformanceConfig {
  virtualizeThreshold: number; // 100 suggestions
  debounceUpdateMs: number; // 150ms
  maxConcurrentHighlights: number; // 50
  useRequestAnimationFrame: boolean; // true
  cacheCalculations: boolean; // true
}

interface HighlightCache {
  boundaries: Map<string, HighlightBoundary>;
  positions: Map<string, DOMRect>;
  lastContentHash: string;
  lastUpdate: number;
}
```

**Responsibilities:**
- Maintain smooth performance with many suggestions
- Cache boundary calculations to avoid recalculation
- Use efficient DOM manipulation techniques
- Debounce updates during rapid content changes
- Virtualize highlights when necessary for performance
- Provide smooth scrolling and interaction

## Data Models

### Active Suggestion State
```typescript
interface ActiveSuggestionState {
  activeSuggestionId: string | null;
  currentIndex: number;
  totalSuggestions: number;
  availableSuggestions: string[]; // IDs of unresolved suggestions
  resolvedSuggestions: string[]; // IDs of resolved suggestions
  navigationHistory: string[]; // Track navigation path
}

interface SuggestionResolution {
  suggestionId: string;
  action: 'accepted' | 'rejected';
  editedText?: string; // If user edited the suggestion
  timestamp: number;
  originalText: string;
  finalText: string;
}
```

### Interactive Highlighting Model
```typescript
interface InteractiveHighlight {
  id: string;
  suggestionId: string;
  startOffset: number;
  endOffset: number;
  isActive: boolean; // Whether this is the active suggestion
  isClickable: boolean; // Whether highlight responds to clicks
  style: HighlightStyle;
  hoverStyle: HighlightStyle;
  activeStyle: HighlightStyle;
  onClick: () => void;
}

interface HighlightClickEvent {
  suggestionId: string;
  highlightId: string;
  textContent: string;
  position: { x: number; y: number };
  overlappingSuggestions: string[]; // Other suggestions at same position
}
```

### Active Suggestion Display Model
```typescript
interface ActiveSuggestionDisplay {
  suggestion: Suggestion;
  isEditing: boolean;
  editedText: string;
  showPreview: boolean;
  navigationContext: {
    currentIndex: number;
    totalCount: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

interface SuggestionActionFeedback {
  type: 'accepted' | 'rejected' | 'edited';
  message: string;
  duration: number; // How long to show feedback
  autoAdvance: boolean; // Whether to auto-advance after feedback
}
```

## Error Handling

### Active Suggestion State Recovery
- Handle cases where active suggestion becomes invalid (deleted, resolved externally)
- Gracefully recover when navigation state becomes inconsistent
- Provide fallback when no suggestions are available
- Handle suggestion loading failures without breaking active state
- Maintain navigation consistency when suggestions are added/removed dynamically

### Highlighting Click Error Recovery
- Handle clicks on highlights that no longer exist
- Recover when highlight-to-suggestion mapping becomes invalid
- Provide feedback when clicked suggestion cannot be activated
- Handle overlapping suggestion click conflicts gracefully
- Maintain highlighting when DOM structure changes

### Suggestion Resolution Error Recovery
- Handle accept/reject action failures gracefully
- Provide retry mechanisms for failed suggestion actions
- Maintain state consistency when resolution actions fail
- Handle network failures during suggestion updates
- Provide clear error feedback without losing user progress

### Navigation Error Recovery
- Handle navigation when suggestion list changes during use
- Recover from invalid navigation states (out of bounds)
- Provide fallback navigation when auto-advance fails
- Handle keyboard navigation conflicts
- Maintain navigation history integrity

## Testing Strategy

### Active Suggestion Navigation Testing
- Test navigation between suggestions using previous/next controls
- Test clicking highlighted text to change active suggestion
- Test auto-advancement after suggestion resolution
- Test navigation with overlapping suggestions
- Test navigation state consistency during suggestion changes

### Highlighting Interaction Testing
- Test clickable highlights respond correctly to user clicks
- Test active suggestion highlighting is visually distinct
- Test hover states on interactive highlights
- Test highlighting accuracy with various text scenarios
- Test highlight updates when active suggestion changes

### Suggestion Resolution Testing
- Test accept/reject actions from active suggestion area
- Test editing suggestions before accepting
- Test suggestion resolution feedback and auto-advancement
- Test resolution state persistence and consistency
- Test handling of resolution failures and retries

### Active Suggestion Area Testing
- Test positioning and visibility of active suggestion area
- Test responsive behavior across different screen sizes
- Test empty state handling when no suggestions exist
- Test loading states during suggestion operations
- Test area doesn't interfere with content editing

### Performance and Usability Testing
- Test performance with large numbers of suggestions
- Test smooth transitions between active suggestions
- Test keyboard accessibility for navigation and actions
- Test screen reader compatibility with active suggestion system
- Test overall user workflow efficiency compared to previous approach

## Implementation Approach

### Phase 1: Active Suggestion State Management
1. Create ActiveSuggestionManager to track current active suggestion
2. Implement navigation logic for previous/next suggestion movement
3. Add suggestion resolution tracking and auto-advancement
4. Create state management for available vs resolved suggestions
5. Test navigation and state consistency

### Phase 2: Interactive Highlighting System
1. Redesign highlighting to support clickable interactions
2. Implement distinct visual states for active vs inactive suggestions
3. Add click handlers for changing active suggestion via text clicks
4. Handle overlapping suggestions with click cycling
5. Test highlighting interactions and visual feedback

### Phase 3: Active Suggestion Area Component
1. Create ActiveSuggestionArea component for focused suggestion display
2. Implement navigation controls (previous/next buttons)
3. Add suggestion action buttons (accept/reject/edit)
4. Position area appropriately to not interfere with content
5. Test suggestion area functionality and positioning

### Phase 4: Suggestion Editing Interface
1. Implement editing capabilities for suggestions before accepting
2. Add preview functionality to show changes before applying
3. Create validation for edited suggestion text
4. Add clear visual feedback for suggestion actions
5. Test editing workflow and user experience

### Phase 5: Integration and Auto-Advancement
1. Integrate all components into cohesive active suggestion system
2. Implement auto-advancement after suggestion resolution
3. Add scroll-to-active functionality for better navigation
4. Ensure smooth transitions between suggestions
5. Test complete user workflow from start to finish

### Phase 6: Performance and Polish
1. Optimize performance for large numbers of suggestions
2. Add smooth animations and transitions for state changes
3. Implement responsive behavior for different screen sizes
4. Add accessibility features for keyboard and screen reader users
5. Conduct comprehensive testing and refinement

## Performance Considerations

### Active Suggestion State Performance
- Use efficient state management to avoid unnecessary re-renders
- Cache suggestion navigation calculations
- Implement debounced state updates for rapid navigation
- Optimize suggestion filtering for available vs resolved
- Use memoization for expensive suggestion processing

### Interactive Highlighting Performance
- Optimize click event handling for large numbers of highlights
- Cache highlight position calculations
- Use efficient DOM queries for highlight interactions
- Implement smooth visual transitions without blocking UI
- Minimize re-rendering when active suggestion changes

### Suggestion Resolution Performance
- Batch suggestion updates to reduce API calls
- Implement optimistic UI updates for immediate feedback
- Cache suggestion action results
- Use efficient data structures for tracking resolution state
- Minimize DOM manipulation during suggestion resolution

### Navigation Performance
- Optimize previous/next navigation for large suggestion sets
- Implement efficient scroll-to-active functionality
- Cache navigation state to avoid recalculation
- Use smooth scrolling without blocking user interaction
- Optimize auto-advancement timing and transitions

## Accessibility Considerations

### Active Suggestion Navigation Accessibility
- Provide keyboard shortcuts for previous/next navigation (arrow keys)
- Implement proper ARIA labels for navigation controls
- Announce active suggestion changes to screen readers
- Support tab navigation through suggestion actions
- Provide skip links for efficient navigation

### Interactive Highlighting Accessibility
- Ensure sufficient color contrast for all highlight states
- Provide alternative access methods for highlight clicking
- Support high contrast mode and custom color schemes
- Announce highlight interactions to screen readers
- Provide keyboard alternatives to mouse clicks

### Suggestion Action Accessibility
- Implement proper ARIA labels for accept/reject/edit buttons
- Support keyboard activation of all suggestion actions
- Provide clear feedback for completed actions
- Ensure editing interface is keyboard accessible
- Announce suggestion resolution results

### Focus Management
- Maintain logical focus order through active suggestion area
- Return focus appropriately after suggestion resolution
- Provide clear focus indicators for all interactive elements
- Handle focus during auto-advancement between suggestions
- Support focus trapping when editing suggestions
