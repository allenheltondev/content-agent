import { useState } from 'react';
import type { Suggestion, SuggestionType } from '../../types';

interface SuggestionListProps {
  suggestions: Suggestion[];
  content: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  className?: string;
}

/**
 * Get color classes for suggestion type
 */
const getSuggestionColors = (type: SuggestionType) => {
  const colorMap = {
    llm: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-800'
    },
    brand: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-800'
    },
    fact: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-800'
    },
    grammar: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-800'
    },
    spelling: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800'
    }
  };

  return colorMap[type];
};

/**
 * Get type display name
 */
const getTypeDisplayName = (type: SuggestionType): string => {
  const nameMap = {
    llm: 'AI Suggestion',
    brand: 'Brand Guidelines',
    fact: 'Fact Check',
    grammar: 'Grammar',
    spelling: 'Spelling'
  };

  return nameMap[type];
};

/**
 * Get priority icon
 */
const getPriorityIcon = (priority: string) => {
  switch (priority) {
    case 'high':
      return (
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    case 'medium':
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      );
  }
};

/**
 * SuggestionList component displays suggestions in a list format
 */
export const SuggestionList = ({
  suggestions,
  content,
  onAccept,
  onReject,
  className = ''
}: SuggestionListProps) => {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  const toggleExpanded = (suggestionId: string) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(suggestionId)) {
      newExpanded.delete(suggestionId);
    } else {
      newExpanded.add(suggestionId);
    }
    setExpandedSuggestions(newExpanded);
  };

  const getContextText = (suggestion: Suggestion) => {
    const { startOffset, endOffset } = suggestion;
    const contextLength = 50;

    const beforeStart = Math.max(0, startOffset - contextLength);
    const afterEnd = Math.min(content.length, endOffset + contextLength);

    const beforeText = content.substring(beforeStart, startOffset);
    const highlightText = content.substring(startOffset, endOffset);
    const afterText = content.substring(endOffset, afterEnd);

    return {
      before: beforeStart > 0 ? '...' + beforeText : beforeText,
      highlight: highlightText,
      after: afterEnd < content.length ? afterText + '...' : afterText
    };
  };

  if (suggestions.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p>No suggestions available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 sm:space-y-4 ${className}`}>
      {suggestions.map((suggestion) => {
        const colors = getSuggestionColors(suggestion.type);
        const isExpanded = expandedSuggestions.has(suggestion.id);
        const context = getContextText(suggestion);

        return (
          <div
            key={suggestion.id}
            className={`border rounded-lg p-3 sm:p-4 transition-all duration-200 ${colors.border} ${colors.bg}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  {getPriorityIcon(suggestion.priority)}
                  <span className={`text-sm font-medium ${colors.text}`}>
                    {getTypeDisplayName(suggestion.type)}
                  </span>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors.badge} self-start sm:self-auto`}>
                  {suggestion.priority} priority
                </span>
              </div>

              <button
                onClick={() => toggleExpanded(suggestion.id)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors touch-manipulation"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            {/* Content preview */}
            <div className="mb-3">
              <div className="text-sm text-gray-700 mb-2">
                <span className="font-medium">Change:</span>
              </div>
              <div className="bg-white rounded p-3 border border-gray-200">
                <div className="text-sm font-mono">
                  <span className="line-through text-gray-500">"{suggestion.textToReplace}"</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className={`font-medium ${colors.text}`}>"{suggestion.replaceWith}"</span>
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="space-y-3 border-t border-gray-200 pt-3">
                {/* Context */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">Context:</div>
                  <div className="bg-white rounded p-3 border border-gray-200">
                    <div className="text-sm font-mono text-gray-600">
                      {context.before}
                      <span className="bg-yellow-200 px-1 rounded">{context.highlight}</span>
                      {context.after}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {suggestion.reason && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">Reason:</div>
                    <div className="text-sm text-gray-600">
                      {suggestion.reason}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-500 space-y-1">
                  <div>Position: {suggestion.startOffset}-{suggestion.endOffset}</div>
                  <div>Created: {new Date(suggestion.createdAt).toLocaleString()}</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
              <button
                onClick={() => onAccept(suggestion.id)}
                className="flex-1 px-4 py-3 sm:py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 touch-manipulation"
              >
                <span className="hidden sm:inline">Accept Change</span>
                <span className="sm:hidden">Accept</span>
              </button>
              <button
                onClick={() => onReject(suggestion.id)}
                className="flex-1 px-4 py-3 sm:py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 touch-manipulation"
              >
                Reject
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
