import React, { useMemo } from 'react';
import { EyeIcon, EyeSlashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import type { Suggestion } from '../../types';

/**
 * Props for SuggestionPreview component
 */
export interface SuggestionPreviewProps {
  suggestion: Suggestion;
  editedText?: string;
  fullContent?: string;
  isVisible: boolean;
  onToggle: () => void;
  className?: string;
  showFullContext?: boolean;
}

/**
 * Get suggestion type color for consistent styling
 */
const getSuggestionTypeColor = (type: string) => {
  const colors = {
    llm: 'blue',
    brand: 'purple',
    fact: 'orange',
    grammar: 'green',
    spelling: 'red'
  };
  return colors[type as keyof typeof colors] || 'gray';
};

/**
 * Generate extended context around the suggestion
 */
const getExtendedContext = (
  fullContent: string,
  suggestion: Suggestion,
  contextLength: number = 150
): { before: string; after: string } => {
  const { startOffset, endOffset } = suggestion;

  const extendedStart = Math.max(0, startOffset - contextLength);
  const extendedEnd = Math.min(fullContent.length, endOffset + contextLength);

  const before = fullContent.substring(extendedStart, startOffset);
  const after = fullContent.substring(endOffset, extendedEnd);

  return { before, after };
};

/**
 * SuggestionPreview component shows detailed before/after comparison
 */
export const SuggestionPreview: React.FC<SuggestionPreviewProps> = ({
  suggestion,
  editedText,
  fullContent,
  isVisible,
  onToggle,
  className = '',
  showFullContext = false
}) => {
  const suggestionColor = getSuggestionTypeColor(suggestion.type);
  const hasEditedText = editedText && editedText.trim() !== suggestion.replaceWith;

  // Get context for preview
  const context = useMemo(() => {
    if (showFullContext && fullContent) {
      return getExtendedContext(fullContent, suggestion);
    }
    return {
      before: suggestion.contextBefore,
      after: suggestion.contextAfter
    };
  }, [showFullContext, fullContent, suggestion]);

  // Determine what text to show in the preview
  const previewText = hasEditedText ? editedText.trim() : suggestion.replaceWith;
  const isCustomEdit = hasEditedText;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggle}
        className={`
          inline-flex items-center text-sm font-medium transition-colors
          text-${suggestionColor}-600 hover:text-${suggestionColor}-800
        `}
      >
        {isVisible ? (
          <>
            <EyeSlashIcon className="w-4 h-4 mr-2" />
            Hide Preview
          </>
        ) : (
          <>
            <EyeIcon className="w-4 h-4 mr-2" />
            Show Preview
          </>
        )}
      </button>

      {/* Preview content */}
      {isVisible && (
        <div className="space-y-4">
          {/* Before/After comparison */}
          <div className="grid grid-cols-1 gap-4">
            {/* Original text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  Current Text
                </h4>
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                  Will be replaced
                </span>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm">
                <span className="text-gray-500">{context.before}</span>
                <span className="bg-red-200 text-red-900 px-1 rounded font-medium">
                  {suggestion.textToReplace}
                </span>
                <span className="text-gray-500">{context.after}</span>
              </div>
            </div>

            {/* Arrow indicator */}
            <div className="flex justify-center">
              <ArrowRightIcon className="w-5 h-5 text-gray-400" />
            </div>

            {/* Suggested/edited text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-900">
                  {isCustomEdit ? 'Your Version' : 'Suggested Text'}
                </h4>
                <span className={`
                  text-xs px-2 py-1 rounded
                  ${isCustomEdit
                    ? 'text-blue-600 bg-blue-100'
                    : `text-${suggestionColor}-600 bg-${suggestionColor}-100`
                  }
                `}>
                  {isCustomEdit ? 'Custom edit' : 'AI suggestion'}
                </span>
              </div>
              <div className={`
                p-3 border rounded-md text-sm
                ${isCustomEdit
                  ? 'bg-blue-50 border-blue-200'
                  : `bg-${suggestionColor}-50 border-${suggestionColor}-200`
                }
              `}>
                <span className="text-gray-500">{context.before}</span>
                <span className={`
                  px-1 rounded font-medium
                  ${isCustomEdit
                    ? 'bg-blue-200 text-blue-900'
                    : `bg-${suggestionColor}-200 text-${suggestionColor}-900`
                  }
                `}>
                  {previewText}
                </span>
                <span className="text-gray-500">{context.after}</span>
              </div>
            </div>
          </div>

          {/* Additional information */}
          <div className="pt-3 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
              <div>
                <span className="font-medium">Type:</span> {suggestion.type}
              </div>
              <div>
                <span className="font-medium">Priority:</span> {suggestion.priority}
              </div>
            </div>

            {suggestion.reason && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">Reason:</span> {suggestion.reason}
              </div>
            )}

            {/* Character count comparison */}
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Length change:</span>{' '}
              {suggestion.textToReplace.length} → {previewText.length} characters
              {previewText.length !== suggestion.textToReplace.length && (
                <span className={`ml-1 ${
                  previewText.length > suggestion.textToReplace.length
                    ? 'text-orange-600'
                    : 'text-green-600'
                }`}>
                  ({previewText.length > suggestion.textToReplace.length ? '+' : ''}
                  {previewText.length - suggestion.textToReplace.length})
                </span>
              )}
            </div>
          </div>

          {/* Full context toggle (if available) */}
          {fullContent && !showFullContext && (
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-700"
                onClick={() => {
                  // This would need to be handled by parent component
                  console.log('Toggle full context');
                }}
              >
                Show more context
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

SuggestionPreview.displayName = 'SuggestionPreview';
