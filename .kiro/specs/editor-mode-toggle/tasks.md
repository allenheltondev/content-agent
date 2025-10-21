# Implementation Plan

- [x] 1. Create core mode toggle infrastructure





  - Create EditorModeProvider context with basic state management for 'edit' and 'review' modes
  - Implement mode switching functions (switchToEditMode, switchToReviewMode)
  - Add content change tracking state (lastEditTimestamp, contentAtLastReview)
  - Set up transition state management (isTransitioning, pendingRecalculation)
  - _Requirements: 1.1, 1.2, 1.5, 6.4_

- [ ]* 1.1 Write unit tests for EditorModeProvider
  - Test mode switching logic and state transitions
  - Test content change tracking functionality
  - Test transition state management
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Implement ModeToggleButton component





  - Create toggle button component with clear Edit/Review mode indicators
  - Implement visual styling for active/inactive states with appropriate colors
  - Add hover and focus states with smooth CSS transitions
  - Implement keyboard navigation support (Tab, Enter, Space)
  - Add tooltips explaining mode functionality
  - Integrate with EditorModeProvider context for mode switching
  - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2, 6.3, 6.5_

- [ ]* 2.1 Write accessibility tests for ModeToggleButton
  - Test keyboard navigation and activation
  - Test ARIA labels and screen reader announcements
  - Test focus management and visual indicators
  - _Requirements: 4.3, 6.2, 6.3_

- [x] 3. Enhance ContentEditorWithSuggestions for mode awareness





  - Add editorMode prop to control behavior based on current mode
  - Implement Edit mode: hide suggestions overlay, enable full content editing
  - Implement Review mode: show suggestions prominently, disable content editing
  - Add smooth visual transitions between modes using CSS transitions
  - Integrate with EditorModeProvider to respond to mode changes
  - Preserve existing suggestion interaction functionality in Review mode
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.4, 4.5_

- [ ]* 3.1 Write component tests for mode-aware editor behavior
  - Test Edit mode functionality (editing enabled, suggestions hidden)
  - Test Review mode functionality (editing disabled, suggestions visible)
  - Test mode transition visual behavior
  - _Requirements: 2.1, 2.3, 3.1, 3.2_

- [x] 4. Create content change tracking system





  - Implement content diff calculation to detect changes between Edit and Review modes
  - Create ContentDiff interface and calculation functions
  - Add content change detection in EditorModeProvider
  - Track content modifications with timestamps for suggestion recalculation
  - Store contentAtLastReview to compare against current content
  - _Requirements: 5.1, 5.2_

- [ ]* 4.1 Write unit tests for content change tracking
  - Test content diff calculation accuracy
  - Test change detection and timestamp tracking
  - Test content comparison logic
  - _Requirements: 5.1, 5.2_

- [x] 5. Build SuggestionRecalculationService





  - Create service to calculate how content changes affect suggestion positions
  - Implement suggestion position delta calculation based on content diffs
  - Add logic to invalidate suggestions that overlap with changed content
  - Create suggestion position update functions using calculated deltas
  - Integrate with existing suggestion API to request new suggestions for changed areas
  - _Requirements: 5.3, 5.4, 5.5_

- [ ]* 5.1 Write unit tests for suggestion recalculation logic
  - Test position delta calculations
  - Test suggestion invalidation for overlapping changes
  - Test suggestion position updates
  - _Requirements: 5.3, 5.4_

- [x] 6. Implement suggestion recalculation on mode switch





  - Add recalculation trigger when switching from Edit to Review mode
  - Integrate SuggestionRecalculationService with EditorModeProvider
  - Show loading indicator during suggestion recalculation process
  - Handle API calls to get new suggestions for modified content areas
  - Update suggestion manager with recalculated and new suggestions
  - _Requirements: 5.6, 1.5_

- [ ]* 6.1 Write integration tests for suggestion recalculation
  - Test full recalculation workflow from Edit to Review mode
  - Test API integration for new suggestion requests
  - Test loading states during recalculation
  - _Requirements: 5.6, 1.5_

- [x] 7. Add ModeTransitionManager for smooth transitions





  - Create transition manager to coordinate mode switching with loading states
  - Implement smooth animations and visual feedback during transitions
  - Add error handling for failed suggestion recalculations
  - Provide retry functionality for failed transitions
  - Ensure UI remains responsive during background recalculation operations
  - _Requirements: 4.6, 1.4_

- [ ]* 7.1 Write tests for transition management
  - Test transition coordination and loading states
  - Test error handling and retry functionality
  - Test UI responsiveness during transitions
  - _Requirements: 4.6, 1.4_

- [x] 8. Integrate mode toggle with EditorPage





  - Add EditorModeProvider wrapper to EditorPage component
  - Place ModeToggleButton in appropriate location within editor UI
  - Update ContentEditorWithSuggestions integration to use mode-aware props
  - Ensure proper integration with existing suggestion manager hooks
  - Test complete user workflow from editing to reviewing suggestions
  - _Requirements: 1.6, 2.5, 3.4_

- [ ]* 8.1 Write end-to-end tests for complete editor workflow
  - Test full user journey from Edit mode through Review mode
  - Test suggestion recalculation after content editing
  - Test mode switching with real content and suggestions
  - _Requirements: 1.6, 2.5, 3.4_

- [x] 9. Add keyboard shortcuts and accessibility enhancements





  - Implement Ctrl+M (Cmd+M on Mac) keyboard shortcut for quick mode switching
  - Add ARIA labels and announcements for mode changes
  - Ensure proper focus management during mode transitions
  - Add screen reader support for mode toggle and current mode state
  - Implement high contrast mode support for visual indicators
  - _Requirements: 6.2, 6.3, 4.3_

- [ ]* 9.1 Write accessibility compliance tests
  - Test keyboard shortcuts and navigation
  - Test screen reader compatibility
  - Test focus management and ARIA labels
  - _Requirements: 6.2, 6.3, 4.3_

- [x] 10. Implement error handling and user feedback





  - Add error handling for suggestion recalculation failures
  - Provide clear error messages when mode switching fails
  - Implement fallback behavior when suggestion API is unavailable
  - Add user-friendly notifications for successful mode switches
  - Create recovery options for failed suggestion recalculations
  - _Requirements: 1.4, 5.6_

- [ ]* 10.1 Write error handling tests
  - Test error scenarios and recovery mechanisms
  - Test fallback behavior for API failures
  - Test user notification systems
  - _Requirements: 1.4, 5.6_

- [x] 11. Performance optimization and caching





  - Implement debouncing for rapid mode switches to prevent excessive API calls
  - Add caching for suggestion position calculations
  - Optimize content diff calculations for large documents
  - Use React.memo and useMemo to prevent unnecessary re-renders during mode switches
  - Implement efficient suggestion position update algorithms
  - _Requirements: 1.4, 5.3_

- [ ]* 11.1 Write performance tests
  - Test mode switching performance with large documents
  - Test suggestion recalculation performance
  - Test memory usage and render optimization
  - _Requirements: 1.4, 5.3_
