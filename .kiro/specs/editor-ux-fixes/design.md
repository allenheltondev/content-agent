# Design Document

## Overview

This design addresses three critical UX issues that are making the blog editor unusable: authentication persistence failures, title editor visibility problems, and severe content flickering. The solution focuses on robust authentication state management, improved title editor styling, and eliminating render loops that cause content instability.

## Architecture

### Authentication Persistence Architecture
```
AuthContext (enhanced)
├── Token Refresh Manager
├── Session Persistence Layer
├── Page Load Auth Checker
└── Error Recovery System
```

### Editor Stability Architecture
```
EditorPage (stabilized)
├── TitleEditor (enhanced styling)
├── ContentEditor (render-optimized)
├── DraftRecoveryDialog (intelligent)
└── State Management (optimized)
```

### State Management Strategy
- Implement memoization to prevent unnecessary re-renders
- Use stable references for callback functions
- Optimize authentication state persistence
- Eliminate render loops in content editor

## Components and Interfaces

### Enhanced AuthContext
```typescript
interface AuthContextEnhancements {
  // Enhanced token management
  tokenRefreshInterval: NodeJS.Timeout | null;
  lastTokenRefresh: number | null;

  // Session persistence
  persistAuthState: () => void;
  restoreAuthState: () => Promise<boolean>;

  // Page load authentication
  checkAuthOnPageLoad: () => Promise<void>;
}
```

**Responsibilities:**
- Implement automatic token refresh every 45 minutes
- Persist authentication state to localStorage
- Check authentication on page load/refresh
- Handle token expiration gracefully
- Provide robust error recovery

### Enhanced TitleEditor Component
```typescript
interface TitleEditorProps {
  title: string;
  onTitleChange: (title: string) => void;
  placeholder?: string;
  className?: string; // For custom styling
}

interface TitleEditorStyles {
  fontSize: '24px' | '28px' | '32px';
  fontWeight: '600' | '700';
  borderStyle: 'solid' | 'dashed';
  focusIndicator: 'border' | 'shadow' | 'both';
}
```

**Responsibilities:**
- Render large, clearly visible title input (24px+ font)
- Provide strong visual editing indicators
- Handle focus states with clear visual feedback
- Maintain consistent styling across browsers
- Integrate seamlessly with auto-save

### Content Stability Manager
```typescript
interface ContentStabilityConfig {
  preventRerenders: boolean;
  memoizeCallbacks: boolean;
  debounceUpdates: number;
  stableReferences: boolean;
}

interface RenderOptimization {
  useMemo: <T>(factory: () => T, deps: React.DependencyList) => T;
  useCallback: <T extends (...args: any[]) => any>(callback: T, deps: React.DependencyList) => T;
  useStableRef: <T>(value: T) => React.MutableRefObject<T>;
}
```

**Responsibilities:**
- Prevent unnecessary re-renders of content editor
- Memoize expensive operations and callbacks
- Eliminate render loops caused by state changes
- Provide stable references for event handlers
- Optimize draft loading and suggestion rendering

### Intelligent DraftRecoveryDialog
```typescript
interface DraftRecoveryDialogProps {
  isVisible: boolean;
  draftData: DraftData | null;
  onRecover: () => void;
  onDiscard: () => void;
  onDismiss: () => void;
  delayMs?: number; // Configurable delay
}
```

**Responsibilities:**
- Intelligent visibility management with configurable delay
- Prevent jarring UI flashes during page load
- Maintain user choice persistence during session
- Smooth animations for appearance/disappearance

## Data Models

### Authentication State Model
```typescript
interface AuthState {
  user: CognitoUser | null;
  isAuthenticated: boolean;
  tokens: {
    accessToken: string | null;
    idToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
  };
  lastRefresh: number | null;
  persistenceKey: string;
}
```

### Editor Stability Model
```typescript
interface EditorStabilityState {
  isContentStable: boolean;
  renderCount: number;
  lastRenderTime: number;
  preventFlicker: boolean;
  memoizedCallbacks: Map<string, Function>;
  stableRefs: Map<string, any>;
}
```

### Title Editor State Model
```typescript
interface TitleEditorState {
  value: string;
  isFocused: boolean;
  isEditable: boolean;
  hasVisualFeedback: boolean;
  fontSize: number;
  fontWeight: string;
}
```

### Draft Recovery Model
```typescript
interface DraftRecoveryState {
  shouldShow: boolean;
  draftAge: number;
  userChoice: 'pending' | 'recovered' | 'discarded' | 'dismissed';
  sessionDismissed: boolean;
  showDelay: number;
  isVisible: boolean;
}
```

## Error Handling

### Authentication Error Recovery
- Implement automatic token refresh with fallback to login
- Handle network failures during authentication checks
- Provide clear error messages for authentication failures
- Maintain authentication state during temporary network issues
- Implement exponential backoff for token refresh attempts

### Content Stability Error Handling
- Detect and prevent render loops automatically
- Implement circuit breaker for excessive re-renders
- Provide fallback UI when content becomes unstable
- Log render performance issues for debugging
- Gracefully handle state corruption that causes flickering

### Title Editor Error States
- Handle focus/blur events gracefully
- Provide fallback styling when CSS fails to load
- Maintain editability even with styling issues
- Handle keyboard navigation properly
- Recover from input field corruption

### Draft Dialog Error States
- Handle corrupted draft data gracefully
- Provide fallback when draft recovery fails
- Clear invalid drafts automatically
- Handle timing issues with dialog visibility

## Testing Strategy

### Authentication Persistence Testing
- Page refresh scenarios with valid/expired tokens
- Browser close/reopen with token persistence
- Network interruption during token refresh
- Multiple tab authentication synchronization
- Token expiration edge cases

### Content Stability Testing
- Rapid typing scenarios to detect flickering
- Draft loading with large content
- Suggestion loading impact on content stability
- Auto-save triggering during active editing
- State change scenarios that could cause re-renders

### Title Editor Usability Testing
- Visual clarity across different screen sizes
- Focus/blur behavior with keyboard navigation
- Placeholder text visibility and contrast
- Editing state visual indicators
- Cross-browser styling consistency

### Manual Testing Scenarios
- Authentication persistence across page refreshes
- Content editor stability during extended editing sessions
- Title editor visibility and editability
- Draft dialog timing and appearance
- Network failure recovery scenarios

## Implementation Approach

### Phase 1: Authentication Persistence Fix
1. Enhance AuthContext with token persistence
2. Implement automatic token refresh mechanism
3. Add page load authentication checking
4. Implement robust error recovery for auth failures

### Phase 2: Content Stability Fix
1. Identify and eliminate render loops in EditorPage
2. Implement memoization for expensive operations
3. Optimize state management to prevent flickering
4. Add render performance monitoring

### Phase 3: Title Editor Enhancement
1. Update TitleEditor component styling for visibility
2. Implement clear visual editing indicators
3. Enhance focus/blur behavior
4. Add proper contrast and accessibility

### Phase 4: Draft Dialog Intelligence
1. Implement intelligent draft age detection
2. Add delayed visibility with smooth animations
3. Implement session-based dismissal tracking
4. Prevent jarring UI flashes during page load

## Performance Considerations

### Authentication Performance
- Cache authentication state in localStorage for instant page loads
- Implement background token refresh to avoid blocking UI
- Use efficient token validation to minimize API calls
- Optimize authentication checks to prevent UI delays

### Render Performance
- Implement React.memo for components that re-render frequently
- Use useCallback and useMemo to prevent unnecessary re-renders
- Optimize dependency arrays to avoid render loops
- Implement render counting to detect performance issues

### Memory Management
- Clean up authentication timers and intervals on unmount
- Clear cached authentication data when user logs out
- Implement proper cleanup for memoized values
- Optimize draft data storage to prevent memory leaks

### UI Responsiveness
- Use CSS transitions for smooth visual feedback
- Implement debouncing for rapid user interactions
- Optimize title editor rendering for immediate feedback
- Minimize layout shifts during content loading
