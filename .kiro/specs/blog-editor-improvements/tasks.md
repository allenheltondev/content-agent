# Implementation Plan

- [x] 1. Enhance draft management with intelligent cleanup and comparison





  - Update `useDraftPersistence` hook to include content comparison logic
  - Add `isDraftDifferent` method to compare draft with current content
  - Modify draft loading logic to prevent dialog when content matches
  - Update draft clearing to happen on successful save operations
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Consolidate review functionality with real-time feedback







  - [x] 2.1 Update review service to handle simplified response format





    - Modify StartReviewResponse interface to use token and endpoint fields
    - Update review service methods to use new response format
    - Maintain backward compatibility during transition


    - _Requirements: 4.1, 4.2_

  - [x] 2.2 Enhance Submit for Review functionality





    - Remove separate async review button/functionality from EditorPage
    - Update Submit for Review to call review endpoint and start polling


    - Add automatic page scroll to top after review submission
    - Integrate real-time feedback through long polling
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.3 Update useAsyncReview hook for consolidated workflow





    - Modify startReview method to handle new response format
    - Add automatic scroll to top functionality
    - Update polling setup to use provided token and endpoint
    - Ensure proper error handling for new workflow
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.2, 4.3_

- [x] 3. Implement comprehensive error handling and validation





  - [x] 3.1 Enhance draft management error handling


    - Handle localStorage quota exceeded scenarios
    - Provide fallback when draft parsing fails
    - Show user-friendly messages for draft conflicts
    - _Requirements: 1.1, 1.2, 1.3_



  - [x] 3.2 Update review process error handling





    - Handle new response format parsing errors
    - Provide clear feedback when review fails to start
    - Maintain existing error handling patterns
    - _Requirements: 3.4, 4.1, 4.2, 4.3_

- [ ]* 4. Add comprehensive testing coverage
  - [ ]* 4.1 Write unit tests for draft comparison logic
    - Test isDraftDifferent method with various scenarios
    - Test draft cleanup on save operations
    - Test draft dialog display logic
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ]* 4.2 Write integration tests for consolidated review workflow
    - Test complete review flow from submission to completion
    - Test page scroll behavior after review submission
    - Test error scenarios in review process
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
