import { useCallback, useState } from 'react';
import { apiService } from '../services/ApiService';
import type { Suggestion } from '../types';
import type { SuggestionActionFeedback } from '../components/editor/SuggestionActionButtons';

/**
 * Configuration for suggestion actions
 */
export interface SuggestionActionsConfig {
  postId: string;
  onSuggestionResolved?: (suggestionId: string, acn: 'accepted' | 'rejected') => void;
  onContentUpdate?: (newContent: string) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for managing suggestion actions with API integration
 */
export function useSuggestionActions(config: SuggestionActionsConfig) {
  const { postId, onSuggestionResolved, onContentUpdate, onError } = config;

  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<SuggestionActionFeedback | null>(null);

  /**
   * Check if a suggestion is currently being processed
   */
  const isProcessing = useCallback((suggestionId: string): boolean => {
    return processingActions.has(suggestionId);
  }, [processingActions]);

  /**
   * Add suggestion to processing set
   */
  const setProcessing = useCallback((suggestionId: string, processing: boolean) => {
    setProcessingActions(prev => {
      const newSet = new Set(prev);
      if (processing) {
        newSet.add(suggestionId);
      } else {
        newSet.delete(suggestionId);
      }
      return newSet;
    });
  }, []);

  /**
   * Apply a suggestion to content and return updated text
   */
  const applySuggestionToContent = useCallback((
    content: string,
    suggestion: Suggestion,
    customText?: string
  ): string => {
    const { startOffset, endOffset, replaceWith } = suggestion;
    const replacementText = customText || replaceWith;

    // Validate offsets
    if (startOffset < 0 || endOffset > content.length || startOffset >= endOffset) {
      throw new Error('Invalid suggestion offsets');
    }

    return (
      content.substring(0, startOffset) +
      replacementText +
      content.substring(endOffset)
    );
  }, []);

  /**
   * Accept a suggestion with optional custom text
   */
  const acceptSuggestion = useCallback(async (
    suggestion: Suggestion,
    currentContent: string,
    customText?: string
  ): Promise<void> => {
    const suggestionId = suggestion.id;

    try {
      setProcessing(suggestionId, true);

      // Apply suggestion to content
      const updatedContent = applySuggestionToContent(currentContent, suggestion, customText);

      // Update suggestion status via API
      await apiService.updateSuggestionStatus(postId, suggestionId, 'accepted');

      // Update content
      onContentUpdate?.(updatedContent);

      // Notify resolution
      onSuggestionResolved?.(suggestionId, 'accepted');

      // Show success feedback
      setFeedback({
        type: 'accepted',
        message: customText
          ? 'Suggestion accepted with your edits'
          : 'Suggestion accepted',
        duration: 2000,
        autoAdvance: true
      });

    } catch (error) {
      console.error('Failed to accept suggestion:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to accept suggestion';

      onError?.(errorMessage);

      setFeedback({
        type: 'error',
        message: errorMessage,
        duration: 4000
      });
    } finally {
      setProcessing(suggestionId, false);
    }
  }, [postId, applySuggestionToContent, onContentUpdate, onSuggestionResolved, onError, setProcessing]);

  /**
   * Reject a suggestion
   */
  const rejectSuggestion = useCallback(async (suggestion: Suggestion): Promise<void> => {
    const suggestionId = suggestion.id;

    try {
      setProcessing(suggestionId, true);

      // Update suggestion status via API
      await apiService.updateSuggestionStatus(postId, suggestionId, 'rejected');

      // Notify resolution
      onSuggestionResolved?.(suggestionId, 'rejected');

      // Show success feedback
      setFeedback({
        type: 'rejected',
        message: 'Suggestion rejected',
        duration: 2000,
        autoAdvance: true
      });

    } catch (error) {
      console.error('Failed to reject suggestion:', error);

      const errorMessage = error instanceof Error
        ? error.message
        : 'Failed to reject suggestion';

      onError?.(errorMessage);

      setFeedback({
        type: 'error',
        message: errorMessage,
        duration: 4000
      });
    } finally {
      setProcessing(suggestionId, false);
    }
  }, [postId, onSuggestionResolved, onError, setProcessing]);

  /**
   * Edit a suggestion (update the suggestion text without applying it)
   */
  const editSuggestion = useCallback(async (
    suggestion: Suggestion,
    newText: string
  ): Promise<Suggestion> => {
    // For now, this is a local operation since the API doesn't support editing suggestions
    // In a full implementation, this would update the suggestion on the server

    const updatedSuggestion: Suggestion = {
      ...suggestion,
      replaceWith: newText
    };

    setFeedback({
      type: 'edited',
      message: 'Suggestion text updated',
      duration: 2000
    });

    return updatedSuggestion;
  }, []);

  /**
   * Clear current feedback
   */
  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  /**
   * Set custom feedback
   */
  const showFeedback = useCallback((newFeedback: SuggestionActionFeedback) => {
    setFeedback(newFeedback);
  }, []);

  /**
   * Check if any suggestions are being processed
   */
  const hasProcessingActions = processingActions.size > 0;

  return {
    // Action methods
    acceptSuggestion,
    rejectSuggestion,
    editSuggestion,

    // State
    isProcessing,
    hasProcessingActions,
    feedback,

    // Feedback management
    clearFeedback,
    showFeedback,

    // Utility
    applySuggestionToContent
  };
}
