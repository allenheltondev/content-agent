# Design Document

## Overview

The Betterer rebranding design focuses on creating a cohesive, professional brand experience while maintaining the application's usability and perfoe. The design implements a modern color palette, consistent logo placement, improved user onboarding through dismissible info boxes, and fixes critical authentication issues in the signup flow.

## Architecture

### Brand System Architecture

The brand system will be implemented through a hierarchical approach:

1. **CSS Custom Properties Layer**: Define brand colors as CSS custom properties for maintainability
2. **Tailwind Theme Extension**: Extend Tailwind's theme with Betterer-specific colors and utilities
3. **Component-Level Branding**: Apply brand colors consistently across all React components
4. **Asset Management**: Centralize logo and favicon management for consistent display

### Color System Hierarchy

```
Primary (#219EFF) - Main brand color for primary actions, links, focus states
Secondary (#FFB02E) - Accent color for highlights, success states, call-to-action elements
Tertiary (#2B2D42) - Text color, borders, neutral elements, professional contrast
```

## Components and Interfaces

### 1. Theme Configuration Component

**File**: `blog-editor-ui/tailwind.config.js`

**Purpose**: Centralize brand colors and extend Tailwind's default theme

**Implementation**:
- Add Betterer color palette to theme.extend.colors
- Define semantic color names (primary, secondary, tertiary)
- Maintain existing suggestion type colors for backward compatibility

### 2. CSS Custom Properties

**File**: `blog-editor-ui/src/index.css`

**Purpose**: Define CSS custom properties for brand colors

**Implementation**:
```css
:root {
  --color-primary: #219EFF;
  --color-secondary: #FFB02E;
  --color-tertiary: #2B2D42;
  --color-primary-hover: #1e8ae6;
  --color-secondary-hover: #e69a29;
}
```

### 3. Logo Component

**File**: `blog-editor-ui/src/components/common/Logo.tsx`

**Purpose**: Centralized logo component for consistent branding

**Interface**:
```typescript
interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}
```

### 4. Page Title Hook

**File**: `blog-editor-ui/src/hooks/usePageTitle.ts`

**Purpose**: Manage dynamic page titles with Betterer branding

**Interface**:
```typescript
const usePageTitle = (pageTitle: string) => {
  // Sets document.title to "[pageTitle] | Betterer"
}
```

### 5. Info Box Component

**File**: `blog-editor-ui/src/components/common/InfoBox.tsx`

**Purpose**: Dismissible information boxes for user guidance

**Interface**:
```typescript
interface InfoBoxProps {
  id: string; // Unique identifier for persistence
  title: string;
  content: string | ReactNode;
  type?: 'info' | 'tip' | 'warning';
  onDismiss?: () => void;
}
```

### 6. Info Box Manager Hook

**File**: `blog-editor-ui/src/hooks/useInfoBoxManager.ts`

**Purpose**: Manage info box visibility and persistence

**Interface**:
```typescript
const useInfoBoxManager = () => {
  const isDismissed = (id: string) => boolean;
  const dismissInfoBox = (id: string) => void;
  const resetAllInfoBoxes = () => void;
}
```

## Data Models

### Info Box Persistence Model

**Storage**: localStorage

**Structure**:
```typescript
interface DismissedInfoBoxes {
  [boxId: string]: {
    dismissedAt: string; // ISO timestamp
    version: string; // App version when dismissed
  }
}
```

**Key**: `betterer_dismissed_info_boxes`

### Theme Configuration Model

**Structure**:
```typescript
interface BettererTheme {
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    secondaryHover: string;
    tertiary: string;
  };
  logo: {
    src: string;
    alt: string;
  };
}
```

## Error Handling

### Authentication Error Resolution

**Problem**: Signup process causes infinite loading and 400 errors

**Root Cause Analysis**:
1. Missing error state management in registration flow
2. Improper loading state handling during async operations
3. Potential Cognito configuration issues

**Solution Design**:

1. **Enhanced Error Handling in AuthContext**:
   - Add specific error types for different failure scenarios
   - Implement proper loading state management
   - Add retry mechanisms for transient failures

2. **Registration Flow Improvements**:
   - Add validation before submission
   - Implement proper error boundaries
   - Add network error detection and handling

3. **User Feedback Enhancements**:
   - Clear error messages for different failure types
   - Progress indicators during registration
   - Success confirmations for each step

### Info Box Error Handling

**Scenarios**:
1. localStorage unavailable or full
2. Malformed persistence data
3. Component rendering errors

**Solutions**:
1. Graceful degradation when localStorage fails
2. Data validation and cleanup for corrupted entries
3. Error boundaries around info box components

## Testing Strategy

### Visual Regression Testing

**Approach**: Manual testing focused on brand consistency

**Test Cases**:
1. Color consistency across all pages and components
2. Logo placement and sizing on different screen sizes
3. Typography and visual hierarchy adherence
4. Info box appearance and dismissal behavior

### Authentication Flow Testing

**Approach**: Manual testing of signup/login flows

**Test Cases**:
1. Successful registration with valid credentials
2. Error handling for invalid email formats
3. Error handling for weak passwords
4. Confirmation code flow testing
5. Network failure scenarios

### Cross-Browser Compatibility

**Target Browsers**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Test Areas**:
1. CSS custom property support
2. Logo rendering and favicon display
3. Info box animations and interactions
4. Authentication form behavior

### Responsive Design Testing

**Breakpoints**:
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

**Test Areas**:
1. Logo scaling and positioning
2. Info box layout and readability
3. Color contrast and accessibility
4. Touch target sizes for dismissal buttons

## Implementation Phases

### Phase 1: Core Branding Infrastructure
1. Update Tailwind configuration with Betterer colors
2. Add CSS custom properties for brand colors
3. Create Logo component
4. Update favicon and page titles

### Phase 2: Component Updates
1. Update LoginPage with new branding
2. Update DashboardPage with new branding
3. Update all buttons and interactive elements
4. Implement page title management

### Phase 3: Info Box System
1. Create InfoBox component
2. Implement persistence logic
3. Add info boxes to key pages
4. Test dismissal and persistence behavior

### Phase 4: Authentication Fixes
1. Debug and fix signup loading issues
2. Improve error handling in AuthContext
3. Add better user feedback for auth errors
4. Test complete registration flow

### Phase 5: Polish and Testing
1. Cross-browser testing
2. Responsive design verification
3. Accessibility improvements
4. Performance optimization
