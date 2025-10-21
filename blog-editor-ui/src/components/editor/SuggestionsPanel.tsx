import { useState, useCallback, useMemo, memo, useRef, useEffect } from 'react';
import type { Suggestion, SuggestionType } from '../../types';
import { apiService } from '../../services/ApiService';
import { useToast } from '../../hooks/useToast';
import { useOptimizedSuggestionList } from '../../hooks/useVirtualizedList';
import {
  getSuggestionAccessibleLabel,
  getSuggestionActionLabel,
  getSuggestionStateAnnouncement,
  announceToScreenReader,
  SuggestionFocusManager
} from '../../utils/suggestionAccessibility';

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  content: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  className?: string;
  expandedSuggestion?: string;
  onExpandSuggestion: (id: string | null) => void;
}



/**
 * Get color classes for suggestion type with accessible styling
 */
const getSuggestionColors = (type: SuggestionType) => {
  // Use accessible colors that meet WCAG AA standards
  // const accessibleColors = getAccessibleSuggestionColors(type);

  const colorMap = {
    llm: {
      bg: 'bg-blue-50',
      border: 'border-blue-600',
      text: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-900'
    },
    brand: {
      bg: 'bg-purple-50',
      border: 'border-purple-600',
      text: 'text-purple-900',
      badge: 'bg-purple-100 text-purple-900'
    },
    fact: {
      bg: 'bg-orange-50',
      border: 'border-orange-600',
      text: 'text-orange-900',
      badge: 'bg-orange-100 text-orange-900'
    },
    grammar: {
      bg: 'bg-green-50',
      border: 'border-green-600',
      text: 'text-green-900',
      badge: 'bg-green-100 text-green-900'
    },
    spelling: {
      bg: 'bg-red-50',
      border: 'border-red-600',
      text: 'text-red-900',
      badge: 'bg-red-100 text-red-900'
    }
  };

  return colorMap[type];
};

/**
 * Get type display name
 */
const getTypeDisplayName = (type: SuggestionType): string => {
  const nameMap = {
    llm: 'Writing Enhancement',
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
 * Sort suggestions by content position (startOffset)
 */
const sortSuggestionsByPosition = (suggestions: Suggestion[]): Suggestion[] => {
  return [...suggestions].sort((a, b) => a.startOffset - b.startOffset);
};

/**
 * SuggestionsPanel component for displaying and interacting with suggestions in the editor
 */
export const SuggestionsPanel = memo(({
  suggestions,
  content,
  onAccept,
  onReject,
  onDelete,
  isLoading = false,
  className = '',
  expandedSuggestion,
  onExpandSuggestion
}: SuggestionsPanelProps) => {
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());
  const { showSuccess, showError } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const focusManagerRef = useRef<SuggestionFocusManager | null>(null);

  // Initialize focus manager
  useEffect(() => {
    if (containerRef.current) {
      focusManagerRef.current = new SuggestionFocusManager(containerRef.current);
    }
  }, []);

  // Performance optimization for large lists
  const { shouldVirtualize, visibleItems, totalHeight } = useOptimizedSuggestionList(
    suggestions,
    containerRef as React.RefObject<HTMLDivElement>
  );

  const toggleExpanded = useCallback((suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    const wasExpanded = expandedSuggestion === suggestionId;

    if (wasExpanded) {
      onExpandSuggestion(null);
      announceToScreenReader(getSuggestionStateAnnouncement('collapsed', suggestion));
    } else {
      onExpandSuggestion(suggestionId);
      announceToScreenReader(getSuggestionStateAnnouncement('expanded', suggestion));
    }
  }, [expandedSuggestion, onExpandSuggestion, suggestions]);

  const getContextText = useCallback((suggestion: Suggestion) => {
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
  }, [content]);

  const handleSuggestionAction = useCallback(async (
    suggestionId: string,
    postId: string,
    action: 'accepted' | 'rejected' | 'deleted',
    callback: (id: string) => void
  ) => {
    if (processingActions.has(suggestionId)) {
      return; // Prevent duplicate actions
    }

    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    setProcessingActions(prev => new Set(prev).add(suggestionId));

    try {
      // Call the API to update suggestion status
      await apiService.updateSuggestionStatus(postId, suggestionId, action);

      // Call the callback to update local state
      callback(suggestionId);

      // Show success message with visual feedback
      const actionText = action === 'accepted' ? 'applied' : action === 'rejected' ? 'rejected' : 'deleted';
      showSuccess(`Suggestion ${actionText} successfully`);

      // Announce to screen readers
      announceToScreenReader(getSuggestionStateAnnouncement(action, suggestion), 'assertive');

    } catch (error) {
      console.error(`Failed to ${action} suggestion:`, error);
      showError(`Failed to ${action} suggestion. Please try again.`);
      announceToScreenReader(`Failed to ${action} suggestion. Please try again.`, 'assertive');
    } finally {
      setProcessingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestionId);
        return newSet;
      });
    }
  }, [processingActions, showSuccess, showError, suggestions]);

  // Sort suggestions by position for better organization - memoized to prevent re-calculations
  const sortedSuggestions = useMemo(() => sortSuggestionsByPosition(suggestions), [suggestions]);

  if (isLoading) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 animate-fade-in ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
          <span className="text-sm text-gray-600 animate-pulse-soft">Loading writing improvements...</span>
        </div>
        {/* Loading skeleton */}
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`loading-shimmer rounded-lg h-16 animate-fade-in stagger-${i}`}></div>
          ))}
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 animate-fade-in ${className}`}>
        <div className="animate-bounce-subtle">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-300 transition-colors duration-300 hover:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="font-medium animate-slide-up">No writing improvements available</p>
        <p className="text-sm text-gray-400 mt-1 animate-slide-up stagger-1">Submit your post for review to get personalized writing suggestions</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`space-y-2 ${className}`}
      role="region"
      aria-label="Writing improvements"
      aria-describedby="suggestions-instructions"
      data-testid="suggestions-panel"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Writing Improvements ({suggestions.length})
        </h3>
        <div className="text-sm text-gray-500">
          Click to expand details
        </div>
      </div>

      {/* Screen reader instructions */}
      <div id="suggestions-instructions" className="sr-only">
        Use Tab to navigate between suggestions, Enter or Space to expand or collapse suggestions, and arrow keys to navigate within expanded suggestions.
      </div>

      {/* Render suggestions sorted by position */}
      <div
        className="space-y-2"
        style={shouldVirtualize ? { height: Math.min(totalHeight, 600), overflow: 'auto' } : undefined}
      >
        {(shouldVirtualize ? visibleItems.map(({ item: suggestion, style }) => ({ suggestion, style })) : sortedSuggestions.map(suggestion => ({ suggestion, style: {} }))).map(({ suggestion, style }) => {
          const isExpanded = expandedSuggestion === suggestion.id;
          const isProcessing = processingActions.has(suggestion.id);
          const colors = getSuggestionColors(suggestion.type);
          const context = getContextText(suggestion);

          return (
            <div
              key={suggestion.id}
              style={style}
              className={`border rounded-lg transition-all duration-300 ease-out cursor-pointer hover-lift focus-ring ${colors.border} ${colors.bg} ${
                isExpanded ? 'p-4 shadow-lg ring-2 ring-opacity-20' : 'p-3 hover:shadow-md'
              } ${isExpanded ? `ring-${colors.border.split('-')[1]}-400` : ''}`}
              onClick={() => toggleExpanded(suggestion.id)}
              tabIndex={0}
              role="button"
              aria-expanded={isExpanded}
              aria-label={getSuggestionAccessibleLabel(suggestion)}
              data-suggestion-id={suggestion.id}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleExpanded(suggestion.id);
                } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  // Handle arrow key navigation
                  const currentIndex = sortedSuggestions.findIndex(s => s.id === suggestion.id);
                  const nextIndex = e.key === 'ArrowDown'
                    ? Math.min(currentIndex + 1, sortedSuggestions.length - 1)
                    : Math.max(currentIndex - 1, 0);

                  if (focusManagerRef.current && sortedSuggestions[nextIndex]) {
                    focusManagerRef.current.focusSuggestion(sortedSuggestions[nextIndex].id);
                  }
                }
              }}
            >
              {/* Compact view */}
              {!isExpanded && (
                <div className="flex items-center justify-between animate-fade-in">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="transition-transform duration-200 hover:scale-110">
                        {getPriorityIcon(suggestion.priority)}
                      </div>
                      <span className={`text-sm font-medium transition-colors duration-200 ${colors.text}`}>
                        {getTypeDisplayName(suggestion.type)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 truncate transition-colors duration-200 hover:text-gray-800">
                      "<span className="font-medium">{suggestion.textToReplace}</span>" → "<span className={`font-medium ${colors.text}`}>{suggestion.replaceWith}</span>"
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSuggestionAction(suggestion.id, suggestion.contentId, 'accepted', onAccept);
                      }}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center w-7 h-7 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 transition-all duration-200 button-press hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      title="Accept suggestion"
                      aria-label={getSuggestionActionLabel('accept', suggestion)}
                    >
                      {isProcessing ? (
                        <div className="animate-spin w-3.5 h-3.5 border border-emerald-700 border-t-transparent rounded-full"></div>
                      ) : (
                        <svg className="w-3.5 h-3.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSuggestionAction(suggestion.id, suggestion.contentId, 'rejected', onReject);
                      }}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center w-7 h-7 bg-slate-50 text-slate-600 border border-slate-200 rounded-md hover:bg-slate-100 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1 transition-all duration-200 button-press hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      title="Reject suggestion"
                      aria-label={getSuggestionActionLabel('reject', suggestion)}
                    >
                      {isProcessing ? (
                        <div className="animate-spin w-3.5 h-3.5 border border-slate-600 border-t-transparent rounded-full"></div>
                      ) : (
                        <svg className="w-3.5 h-3.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSuggestionAction(suggestion.id, suggestion.contentId, 'deleted', onDelete);
                      }}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center w-7 h-7 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 transition-all duration-200 button-press hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                      title="Delete suggestion"
                      aria-label={getSuggestionActionLabel('delete', suggestion)}
                    >
                      {isProcessing ? (
                        <div className="animate-spin w-3.5 h-3.5 border border-red-600 border-t-transparent rounded-full"></div>
                      ) : (
                        <svg className="w-3.5 h-3.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Expanded view */}
              {isExpanded && (
                <div className="space-y-4 animate-slide-up expand-enter">
                  {/* Header */}
                  <div className="flex items-start justify-between animate-fade-in">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <div className="transition-transform duration-200 hover:scale-110">
                        {getPriorityIcon(suggestion.priority)}
                      </div>
                      <span className={`text-sm font-medium transition-colors duration-200 ${colors.text}`}>
                        {getTypeDisplayName(suggestion.type)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105 ${colors.badge}`}>
                        {suggestion.priority} priority
                      </span>
                    </div>
                  </div>

                  {/* Content preview */}
                  <div className="animate-fade-in stagger-1">
                    <div className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Change:</span>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 transition-all duration-200 hover:border-gray-300 hover:shadow-sm">
                      <div className="text-sm font-mono">
                        <span className="line-through text-gray-500 transition-colors duration-200">"{suggestion.textToReplace}"</span>
                        <span className="mx-2 text-gray-400 transition-transform duration-300 inline-block hover:scale-110">→</span>
                        <span className={`font-medium transition-colors duration-200 ${colors.text}`}>"{suggestion.replaceWith}"</span>
                      </div>
                    </div>
                  </div>

                  {/* Context */}
                  <div className="animate-fade-in stagger-2">
                    <div className="text-sm font-medium text-gray-700 mb-2">Context:</div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200 transition-all duration-200 hover:border-gray-300 hover:shadow-sm">
                      <div className="text-sm font-mono text-gray-600">
                        {context.before}
                        <span className="bg-yellow-200 px-1 rounded transition-all duration-200 hover:bg-yellow-300">{context.highlight}</span>
                        {context.after}
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  {suggestion.reason && (
                    <div className="animate-fade-in stagger-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Reason:</div>
                      <div className="text-sm text-gray-600 transition-colors duration-200 hover:text-gray-800">
                        {suggestion.reason}
                      </div>
                    </div>
                  )}

                  {/* Actions with real-time status updates */}
                  <div className="flex gap-2 animate-fade-in stagger-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSuggestionAction(suggestion.id, suggestion.contentId, 'accepted', onAccept);
                      }}
                      disabled={isProcessing}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 button-press hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-sm hover:shadow-md"
                      aria-label={getSuggestionActionLabel('accept', suggestion)}
                    >
                      {isProcessing ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Accept
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSuggestionAction(suggestion.id, suggestion.contentId, 'rejected', onReject);
                      }}
                      disabled={isProcessing}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200 button-press hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:shadow-sm"
                      aria-label={getSuggestionActionLabel('reject', suggestion)}
                    >
                      {isProcessing ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-700 border-t-transparent mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-2 transition-transform duration-200 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Reject
                        </div>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSuggestionAction(suggestion.id, suggestion.contentId, 'deleted', onDelete);
                      }}
                      disabled={isProcessing}
                      className="inline-flex items-center justify-center px-3 py-2.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-200 hover:bg-red-100 hover:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 button-press hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:shadow-sm"
                      title="Delete suggestion"
                      aria-label={getSuggestionActionLabel('delete', suggestion)}
                    >
                      {isProcessing ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                      ) : (
                        <svg className="w-4 h-4 transition-transform duration-200 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

SuggestionsPanel.displayName = 'SuggestionsPanel';
