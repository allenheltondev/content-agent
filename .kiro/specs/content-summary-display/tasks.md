# Implementation Plan

- [x] 1. Update TypeScript interfaces and API service





  - Update `SuggestionsResponse` interface to include optional summary field
  - Modify `ApiService.getSuggestions()` method to return both suggestions and summary
  - Ensure backward compatibility with existing API responses
  - _Requirements: 1.1, 1.2, 3.2_

- [x] 2. Extend suggestion manager to handle summary data





  - Add summary field to `SuggestionManagerState` interface
  - Update `loadSuggestions` function to store summary from API response
  - Expose summary in hook return value for components to consume
  - Clear summary when switching between posts
  - _Requirements: 1.1, 3.1, 3.2_

- [x] 3. Create ContentSummary component





  - [x] 3.1 Implement base ContentSummary component with props interface


    - Create `ContentSummaryProps` interface with summary, isLoading, and className
    - Implement component with proper semantic HTML structure
    - Add ARIA labels for accessibility
    - _Requirements: 1.1, 1.2, 2.1_

  - [x] 3.2 Add visual styling using Tailwind CSS


    - Apply distinct card styling with subtle background and rounded corners
    - Implement proper typography for 3-sentence content readability
    - Add responsive design for different screen sizes
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Implement loading and empty state handling


    - Create loading skeleton component for summary loading state
    - Handle graceful rendering when summary is undefined or null
    - Ensure no error states are shown for missing summaries
    - _Requirements: 1.3, 3.3_

- [ ]* 3.4 Write unit tests for ContentSummary component
  - Test component rendering with various summary lengths
  - Test loading state and empty state handling
  - Test accessibility features and ARIA labels
  - _Requirements: 1.1, 1.3, 2.1_

- [x] 4. Integrate ContentSummary into editor interface





  - Import and position ContentSummary component in editor layout
  - Connect component to suggestion manager summary state
  - Position above suggestions list but below editor toolbar
  - Ensure component doesn't interfere with existing editing workflow
  - _Requirements: 1.1, 2.2, 2.3_

- [ ]* 4.1 Write integration tests for editor with summary
  - Test summary display in full editor context
  - Test summary updates when suggestions are reloaded
  - Test error handling when summary loading fails
  - _Requirements: 1.1, 3.1, 3.3_
