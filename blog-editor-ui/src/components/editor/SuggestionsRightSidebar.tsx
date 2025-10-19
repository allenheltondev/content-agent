import React from 'react';
import { SuggestionStats } from './SuggestionStats';
import { SuggestionsPanel } from './SuggestionsPanel';
import type { Suggestion, SuggestionType } from '../../types';

interface SuggestionsRightSidebarProps {
  suggestions: Suggestion[];
  stats: {
    total: number;
    accepted: number;
    rejected: number;
    canUndo: boolean;
    byType: Record<SuggestionType, number>;
  };
  isLoading: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onDelete: (id: string) => void;
  onUndo?: () => void;
  expandedSuggestion?: string;
  onExpandSuggestion: (id: string | null) => void;
  content: string;
  canUndo: boolean;
  className?: string;
}

export const SuggestionsRightSidebar: React.FC<SuggestionsRightSidebarProps> = ({
  suggestions,
  stats,
  isLoading,
  onAccept,
  onReject,
  onDelete,
  onUndo,
  expandedSuggestion,
  onExpandSuggestion,
  content,
  canUndo,
  className = ''
}) => {
  const hasActiveSuggestions = suggestions.length > 0;
  const hasStats = stats.accepted > 0 || stats.rejected > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Suggestion Stats */}
      {(hasActiveSuggestions || hasStats) && (
        <SuggestionStats
          stats={stats}
          onUndoClick={canUndo ? onUndo : undefined}
        />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-gray-600">Loading suggestions...</span>
          </div>
        </div>
      )}

      {/* Suggestions Panel */}
      {hasActiveSuggestions && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <SuggestionsPanel
            suggestions={suggestions}
            content={content}
            onAccept={onAccept}
            onReject={onReject}
            onDelete={onDelete}
            isLoading={isLoading}
            expandedSuggestion={expandedSuggestion}
            onExpandSuggestion={onExpandSuggestion}
          />
        </div>
      )}
    </div>
  );
};

SuggestionsRightSidebar.displayName = 'SuggestionsRightSidebar';
