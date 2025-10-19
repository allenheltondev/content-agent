import React, { useState, useCallback, useEffect } from 'react';
import { CheckIcon, XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import type { Suggestion } from '../../types';
import { SuggestionPreview } from './SuggestionPreview';

/**
 * Action feedback for suggestion operations
 */
export interface SuggestionActionFeedback {
  type: 'accepted' | 'rejected' | 'edited' | 'error';
  message: string;
  duration?: number;
  autoAdvance?: boolean;
}

/**
 * Props for SuggestionActionButtons component
 */
export interface SuggestionActionButtonsProps {
  suggestion: Suggestion;
  onAccept: (suggestionId: string, editedText?: string) => void;
  onReject: (suggestionId: string) => void;
  onEdit: (suggestionId: string, newText: string) => void;
  isProcessing?: boolean;
  allowEditing?: boolean;
  className?: string;
  onFeedback?: (feedback: SuggestionActionFeedback) => void;
  fullContent?: string; // Full content for enhanced preview
}

/**
 * SuggestionActionButtons component provides accept/reject/edit actions for suggestions
 */
export const SuggestionActionButtons: React.FC<SuggestionActionButtonsProps> = ({
  suggestion,
  onAccept,
  onReject,
  onEdit,
  isProcessing = false,
  allowEditing = true,
  className = '',
  onFeedback,
  fullContent
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(suggestion.replaceWith);
  const [showPreview, setShowPreview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset edited text when suggestion changes
  useEffect(() => {
    setEditedText(suggestion.replaceWith);
    setValidationError(null);
  }, [suggestion.replaceWith, suggestion.id]);

  // Handle edit mode toggle
  const handleEditToggle = useCallback(() => {
    if (isEditing) {
      // Cancel editing - reset to original text
      setEditedText(suggestion.replaceWith);
      setIsEditing(false);
      setShowPreview(false);
    } else {
      // Start editing
      setIsEditing(true);
      setShowPreview(false);
    }
  }, [isEditing, suggestion.replaceWith]);

  // Validate edited text
  const validateEditedText = useCallback((text: string): string | null => {
    const trimmedText = text.trim();

    if (!trimmedText) {
      return 'Replacement text cannot be empty';
    }

    if (trimmedText.length > 500) {
      return 'Replacement text is too long (max 500 characters)';
    }

    // Check for potentially problematic characters
    if (/[<>{}[\]\\]/.test(trimmedText)) {
      return 'Replacement text contains invalid characters';
    }

    return null;
  }, []);

  // Handle text change during editing
  const handleTextChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setEditedText(newText);

    // Validate in real-time
    const error = validateEditedText(newText);
    setValidationError(error);
  }, [validateEditedText]);

  // Handle preview toggle
  const handlePreviewToggle = useCallback(() => {
    setShowPreview(!showPreview);
  }, [showPreview]);

  // Handle accept with optional edited text
  const handleAccept = useCallback(() => {
    try {
      const finalText = isEditing && editedText.trim() !== suggestion.replaceWith
        ? editedText.trim()
        : undefined;

      // Validate if editing
      if (finalText) {
        const error = validateEditedText(finalText);
        if (error) {
          setValidationError(error);
          onFeedback?.({
            type: 'error',
            message: `Cannot accept: ${error}`,
            duration: 3000
          });
          return;
        }
      }

      onAccept(suggestion.id, finalText);

      // Provide feedback
      onFeedback?.({
        type: 'accepted',
        message: finalText
          ? 'Suggestion accepted with your edits'
          : 'Suggestion accepted',
        duration: 2000,
        autoAdvance: true
      });

      // Reset editing state after accept
      setIsEditing(false);
      setEditedText(suggestion.replaceWith);
      setShowPreview(false);
      setValidationError(null);
    } catch (error) {
      onFeedback?.({
        type: 'error',
        message: 'Failed to accept suggestion',
        duration: 3000
      });
    }
  }, [isEditing, editedText, suggestion.replaceWith, suggestion.id, onAccept, validateEditedText, onFeedback]);

  // Handle reject
  const handleReject = useCallback(() => {
    try {
      onReject(suggestion.id);

      // Provide feedback
      onFeedback?.({
        type: 'rejected',
        message: 'Suggestion rejected',
        duration: 2000,
        autoAdvance: true
      });

      // Reset editing state after reject
      setIsEditing(false);
      setEditedText(suggestion.replaceWith);
      setShowPreview(false);
      setValidationError(null);
    } catch (error) {
      onFeedback?.({
        type: 'error',
        message: 'Failed to reject suggestion',
        duration: 3000
      });
    }
  }, [suggestion.id, onReject, onFeedback]);

  // Handle save edit
  const handleSaveEdit = useCallback(() => {
    try {
      const trimmedText = editedText.trim();

      if (!trimmedText || trimmedText === suggestion.replaceWith) {
        return;
      }

      const error = validateEditedText(trimmedText);
      if (error) {
        setValidationError(error);
        onFeedback?.({
          type: 'error',
          message: `Cannot save: ${error}`,
          duration: 3000
        });
        return;
      }

      onEdit(suggestion.id, trimmedText);

      // Provide feedback
      onFeedback?.({
        type: 'edited',
        message: 'Suggestion text updated',
        duration: 2000
      });

      setIsEditing(false);
      setShowPreview(false);
      setValidationError(null);
    } catch (error) {
      onFeedback?.({
        type: 'error',
        message: 'Failed to save edit',
        duration: 3000
      });
    }
  }, [editedText, suggestion.replaceWith, suggestion.id, onEdit, validateEditedText, onFeedback]);

  // Get suggestion color for consistent styling
  const getSuggestionColor = (type: string) => {
    const colors = {
      llm: 'blue',
      brand: 'purple',
      fact: 'orange',
      grammar: 'green',
      spelling: 'red'
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const suggestionColor = getSuggestionColor(suggestion.type);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Editing interface */}
      {isEditing && (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                Edit Suggestion
              </label>
              <span className="text-xs text-gray-400">
                {editedText.length}/500
              </span>
            </div>
            <textarea
              value={editedText}
              onChange={handleTextChange}
              disabled={isProcessing}
              className={`
                w-full px-3 py-2 text-sm border rounded-md resize-none
                focus:outline-none focus:ring-2 focus:border-transparent
                ${validationError
                  ? 'border-red-300 focus:ring-red-500'
                  : `focus:ring-${suggestionColor}-500`
                }
                ${isProcessing ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              `}
              rows={3}
              placeholder="Enter your custom replacement text..."
              maxLength={500}
            />

            {/* Validation error */}
            {validationError && (
              <div className="mt-1 text-xs text-red-600 flex items-center">
                <XMarkIcon className="w-3 h-3 mr-1" />
                {validationError}
              </div>
            )}

            {/* Character count warning */}
            {editedText.length > 400 && !validationError && (
              <div className="mt-1 text-xs text-orange-600">
                Approaching character limit
              </div>
            )}
          </div>

          {/* Enhanced Preview */}
          {editedText.trim() && editedText.trim() !== suggestion.replaceWith && !validationError && (
            <SuggestionPreview
              suggestion={suggestion}
              editedText={editedText}
              fullContent={fullContent}
              isVisible={showPreview}
              onToggle={handlePreviewToggle}
              showFullContext={false}
            />
          )}

          {/* Edit action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={
                  isProcessing ||
                  !editedText.trim() ||
                  editedText.trim() === suggestion.replaceWith ||
                  !!validationError
                }
                className={`
                  inline-flex items-center px-3 py-1.5 text-xs font-medium rounded border transition-colors
                  ${!isProcessing &&
                    editedText.trim() &&
                    editedText.trim() !== suggestion.replaceWith &&
                    !validationError
                    ? `text-${suggestionColor}-700 bg-${suggestionColor}-50 border-${suggestionColor}-300 hover:bg-${suggestionColor}-100`
                    : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                  }
                `}
                title={validationError || 'Save your edited suggestion text'}
              >
                <CheckIcon className="w-3 h-3 mr-1" />
                Save Edit
              </button>
              <button
                type="button"
                onClick={handleEditToggle}
                disabled={isProcessing}
                className={`
                  inline-flex items-center px-3 py-1.5 text-xs font-medium rounded border border-gray-300 transition-colors
                  ${isProcessing
                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                    : 'text-gray-700 bg-white hover:bg-gray-50'
                  }
                `}
                title="Cancel editing and revert changes"
              >
                <XMarkIcon className="w-3 h-3 mr-1" />
                Cancel
              </button>
            </div>

            {/* Quick accept edited version */}
            {editedText.trim() &&
             editedText.trim() !== suggestion.replaceWith &&
             !validationError && (
              <button
                type="button"
                onClick={handleAccept}
                disabled={isProcessing}
                className={`
                  inline-flex items-center px-3 py-1.5 text-xs font-medium rounded border transition-colors
                  ${isProcessing
                    ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                    : `text-green-700 bg-green-50 border-green-300 hover:bg-green-100`
                  }
                `}
                title="Accept your edited version immediately"
              >
                <CheckIcon className="w-3 h-3 mr-1" />
                Accept Edit
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main action buttons */}
      {!isEditing && (
        <div className="flex items-center justify-between">
          {/* Edit button */}
          {allowEditing && (
            <button
              type="button"
              onClick={handleEditToggle}
              disabled={isProcessing}
              className={`
                inline-flex items-center px-3 py-1.5 text-xs font-medium rounded border border-gray-300
                ${isProcessing
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
                }
              `}
              title="Edit suggestion before accepting"
            >
              <PencilIcon className="w-3 h-3 mr-1" />
              Edit
            </button>
          )}

          {/* Accept/Reject buttons */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={isProcessing}
              className={`
                inline-flex items-center px-3 py-1.5 text-sm font-medium rounded border border-red-300
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
                ${isProcessing
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-red-700 bg-red-50 hover:bg-red-100'
                }
              `}
              title="Reject this suggestion"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Reject
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={isProcessing}
              className={`
                inline-flex items-center px-3 py-1.5 text-sm font-medium rounded border
                transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${isProcessing
                  ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                  : `text-${suggestionColor}-700 bg-${suggestionColor}-50 border-${suggestionColor}-300 hover:bg-${suggestionColor}-100 focus:ring-${suggestionColor}-500`
                }
              `}
              title="Accept this suggestion"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Accept
            </button>
          </div>
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center py-2">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

SuggestionActionButtons.displayName = 'SuggestionActionButtons';
