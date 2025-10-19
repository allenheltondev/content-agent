import React from 'react';
import type { Suggestion, SuggestionType } from '../../types';

interface SuggestionPopoverProps {
  suggestion: Suggestion;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  position: { top: number; left: number };
  onClose: () => void;
}

/**
 * Get color classes for suggestion type
 */
const getSuggestionColors = (type: SuggestionType) => {
  const colorMap = {
    llm: {
      popover: 'bg-blue-50 border-blue-200',
      accent: 'text-blue-700'
    },
    brand: {
      popover: 'bg-purple-50 border-purple-200',
      accent: 'text-purple-700'
    },
    fact: {
      popover: 'bg-orange-50 border-orange-200',
      accent: 'text-orange-700'
    },
    grammar: {
      popover: 'bg-green-50 border-green-200',
      accent: 'text-green-700'
    },
    spelling: {
      popover: 'bg-red-50 border-red-200',
      accent: 'text-red-700'
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
 * Standalone SuggestionPopover component for suggestion interaction UI
 * This component is extracted from SuggestionHighlight for better modularity
 */
export const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({
  suggestion,
  onAccept,
  onReject,
  position,
  onClose
}) => {
  const colors = getSuggestionColors(suggestion.type);
  const typeDisplayName = getTypeDisplayName(suggestion.type);

  const handleAccept = () => {
    onAccept(suggestion.id);
    onClose();
  };

  const handleReject = () => {
    onReject(suggestion.id);
    onClose();
  };

  return (
    <div
      className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999
      }}
    >
      <div className={`
        w-80 max-w-sm rounded-lg shadow-lg border-2 p-4
        ${colors.popover}
        backdrop-blur-sm
      `}>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`
              w-3 h-3 rounded-full
              ${getSuggestionColors(suggestion.type).popover.split(' ')[0].replace('bg-', 'bg-').replace('-50', '-200')}
              border border-white shadow-sm
            `} />
            <span className={`font-medium text-sm ${colors.accent}`}>
              {typeDisplayName}
            </span>
          </div>
          <span className="text-xs text-gray-500 capitalize">
            {suggestion.priority} priority
          </span>
        </div>

        {/* Original text */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Current text:</div>
          <div className="text-sm bg-white rounded p-2 border border-gray-200 font-mono">
            "{suggestion.textToReplace}"
          </div>
        </div>

        {/* Suggested replacement */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 mb-1">Suggested change:</div>
          <div className="text-sm bg-white rounded p-2 border border-gray-200 font-mono">
            "{suggestion.replaceWith}"
          </div>
        </div>

        {/* Reason */}
        {suggestion.reason && (
          <div className="mb-4">
            <div className="text-xs text-gray-600 mb-1">Reason:</div>
            <div className="text-sm text-gray-700">
              {suggestion.reason}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex space-x-2">
          <button
            onClick={handleAccept}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Accept
          </button>
          <button
            onClick={handleReject}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        </div>

        {/* Arrow pointing to highlight */}
        <div
          className={`
            absolute w-3 h-3 transform rotate-45 -top-1.5 left-6
            ${colors.popover.split(' ')[0]}
            border-l border-t
            ${colors.popover.split(' ')[1]}
          `}
        />
      </div>
    </div>
  );
};
