# Design Document

## Overview

This design addresses critical UX issues in the blog editor application by implementing a compuser onboarding flow, redesigning the dashboard for professional appearance and intuitive navigation, and fixing the broken "Create New Post" functionality. The solution transforms the application from a basic interface into a polished, professional platform that guides users through proper setup and provides an intuitive content creation experience.

## Architecture

### Component Architecture
```
Application Root
├── AuthenticationFlow
│   ├── LoginPage (existing, enhanced)
│   └── ProfileSetupPage (new)
├── MainApplication
│   ├── AppHeader (new, global navigation)
│   ├── DashboardPage (redesigned)
│   ├── ProfilePage (new)
│   └── EditorPage (existing, enhanced navigation)
└── Navigation System
    ├── HeaderNavigation (new)
    └── ProfileNavigation (new)
```

### Data Flow Architecture
```
User Registration → Email Confirmation → Profile Setup → Dashboard → Content Creation
                                      ↓
                                   Profile Data Storage
                                      ↓
                              AI Personalization Context
```

### State Management
- **Profile State**: New context for user profile data (tone, style, topics, skill level)
- **Navigation State**: Enhanced routing with profile completion checks
- **Dashboard State**: Improved post management and creation flow
- **Onboarding State**: Track completion of profile setup

## Components and Interfaces

### 1. Profile Setup System

#### ProfileSetupPage Component
```typescript
interface ProfileSetupPage {
  // Profile data collection
  writingTone: string; // Freetext description of their tone (couple sentences)
  writingStyle: string; // Freetext description of their style (couple sentences)
  topics: string[]; // User-selected and custom topics
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  // UI state
  currentStep: number;
  isSubmitting: boolean;
  validationErrors: Record<string, string>;
}
```

#### Profile Data Model
```typescript
interface UserProfile {
  userId: string;
  writingTone: string;
  writingStyle: string;
  topics: string[];
  skillLevel: string;
  createdAt: number;
  updatedAt: number;
  isComplete: boolean;
}
```

### 2. Enhanced Dashboard Design

#### Professional Header Component
```typescript
interface AppHeader {
  user: CognitoUser;
  currentPage: string;
  showProfileMenu: boolean;
  onNavigateToProfile: () => void;
  onNavigateToDashboard: () => void;
  onLogout: () => void;
}
```

#### Redesigned Dashboard Layout
- **Professional Header Bar**: Consistent branding, navigation, and user menu
- **Visual Texture**: Subtle gradients, shadows, and modern styling
- **Intuitive Content Areas**: Clear sections for different types of content
- **Action-Oriented Design**: Prominent, clear calls-to-action

### 3. Fixed Post Creation Flow

#### Enhanced PostList Component
```typescript
interface EnhancedPostList {
  posts: BlogPost[];
  isLoading: boolean;
  onCreatePost: () => void; // Direct navigation to editor
  onEditPost: (postId: string) => void;
}
```

#### Streamlined Creation Process
- Remove client-side validation requiring title/body
- Direct navigation to editor for new posts
- Handle post creation within the editor interface
- Provide clear feedback during the creation process

### 4. Navigation System

#### Global Navigation Header
```typescript
interface NavigationHeader {
  currentRoute: string;
  userProfile: UserProfile | null;
  navigationItems: NavigationItem[];
  userMenuItems: UserMenuItem[];
}

interface NavigationItem {
  label: string;
  route: string;
  icon: ReactNode;
  isActive: boolean;
}
```

## Data Models

### User Profile Schema
```typescript
interface UserProfile {
  // Identity
  userId: string;
  email: string;
  name: string;

  // Writing preferences
  writingTone: string; // Freetext description of their tone
  writingStyle: string; // Freetext description of their style
  topics: Topic[];
  skillLevel: SkillLevel;

  // Metadata
  isComplete: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

// WritingTone and WritingStyle are now freetext strings allowing users to describe their approach in their own words
type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

interface Topic {
  id: string;
  name: string;
  category: 'technology' | 'business' | 'lifestyle' | 'education' | 'custom';
  isCustom: boolean;
}
```

### Navigation State Schema
```typescript
interface NavigationState {
  currentRoute: string;
  previousRoute: string;
  profileComplete: boolean;
  requiresProfileSetup: boolean;
}
```

## Error Handling

### Profile Setup Error Handling
- **Validation Errors**: Real-time validation with helpful guidance
- **Network Errors**: Retry mechanisms with clear feedback
- **Data Persistence**: Local storage backup during setup process
- **Recovery Options**: Ability to resume incomplete profile setup

### Dashboard Error Handling
- **Post Loading Errors**: Graceful degradation with retry options
- **Creation Errors**: Clear feedback with actionable next steps
- **Navigation Errors**: Fallback routes and error boundaries

### Navigation Error Handling
- **Route Protection**: Redirect to profile setup if incomplete
- **Authentication Errors**: Proper logout and re-authentication flow
- **Profile Access Errors**: Fallback to basic functionality

## Implementation Phases

### Phase 1: Profile Setup System
1. Create ProfileSetupPage component with multi-step form
2. Implement profile data model and storage
3. Add profile completion checks to routing
4. Integrate with authentication flow

### Phase 2: Dashboard Redesign
1. Create professional AppHeader component
2. Redesign DashboardPage with modern styling
3. Implement visual texture and professional branding
4. Add consistent navigation elements

### Phase 3: Fixed Post Creation
1. Remove client-side validation from API service
2. Update PostList to navigate directly to editor
3. Handle post creation within editor interface
4. Implement proper error handling and feedback

### Phase 4: Navigation System
1. Implement global navigation header
2. Add profile access navigation
3. Create consistent navigation patterns
4. Add route protection and state management

## Design Decisions and Rationales

### Profile Setup as Mandatory Onboarding
**Decision**: Require profile setup immediately after email confirmation
**Rationale**: AI writing assistance requires user preferences to be effective. Collecting this upfront ensures better user experience and more relevant suggestions.

### Professional Dashboard Redesign
**Decision**: Transform dashboard from basic to professional appearance
**Rationale**: Users need to trust the platform with their content. A professional appearance builds confidence and credibility.

### Direct Navigation for Post Creation
**Decision**: Remove upfront title/body requirements, navigate directly to editor
**Rationale**: Users should be able to start writing immediately. The editor is the natural place to handle all post creation logic.

### Global Navigation Header
**Decision**: Implement consistent header navigation across all pages
**Rationale**: Users need clear navigation and context awareness. A global header provides consistent access to key functionality.

### Multi-Step Profile Setup
**Decision**: Break profile setup into guided steps with help text
**Rationale**: Reduces cognitive load and provides confidence-building guidance for users unsure about their preferences.
