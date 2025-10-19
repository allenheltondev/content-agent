import { useState, useRef, useEffect } from 'react';
import type { Suggestion, SuggestionType } from '../../types';

interface SuggestionHighlightProps {
  suggestion: Suggestion;
  content: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isVisible?: boolean;
  zIndex?: number;
}

/**
 * Get color classes for suggestion type
 */
const getSuggestionColors = (type: SuggestionType) => {
  const colorMap = {
    llm: {
      highlight: 'bg-blue-200 border-blue-400',
      hover: 'hover:bg-blue-300',
      popover: 'bg-blue-50 border-blue-200',
      accent: 'text-blue-700'
    },
    brand: {
      highlight: 'bg-purple-200 border-purple-400',
      hover: 'hover:bg-purple-300',
      popover: 'bg-purple-50 border-purple-200',
      accent: 'text-purple-700'
    },
    fact: {
      highlight: 'bg-orange-200 border-orange-400',
      hover: 'hover:bg-orange-300',
      popover: 'bg-orange-50 border-orange-200',
      accent: 'text-orange-700'
    },
    grammar: {
      highlight: 'bg-green-200 border-green-400',
      hover: 'hover:bg-green-300',
      popover: 'bg-green-50 border-green-200',
      accent: 'text-green-700'
    },
    spelling: {
      highlight: 'bg-red-200 border-red-400',
      hover: 'hover:bg-red-300',
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
 * SuggestionHighlight component renders individual suggestion highlights
 */
export const SuggestionHighlight = ({
  suggestion,
  content,
  onAccept,
  onReject,
  isVisible = true,
  zIndex = 1000
}: SuggestionHighlightProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const highlightRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const colors = getSuggestionColors(suggestion.type);
  const typeDisplayName = getTypeDisplayName(suggestion.type);

  // Calculate popover position when showing
  useEffect(() => {
    if (showPopover && highlightRef.current) {
      const highlightRect = highlightRef.current.getBoundingClientRect();
      const popoverHeight = 200; // Estimated popover height
      const popoverWidth = 300; // Estimated popover width

      // Calculate position relative to viewport
      let top = highlightRect.bottom + 8;
      let left = highlightRect.left;

      // Adjust if popover would go off-screen
      if (top + popoverHeight > window.innerHeight) {
        top = highlightRect.top - popoverHeight - 8;
      }

      if (left + popoverWidth > window.innerWidth) {
        left = window.innerWidth - popoverWidth - 16;
      }

      if (left < 16) {
        left = 16;
      }

      setPopoverPosition({ top, left });
    }
  }, [showPopover]);

  // Handle mouse events
  const handleMouseEnter = () => {
    setIsHovered(true);
    setShowPopover(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Delay hiding popover to allow interaction
    setTimeout(() => {
      if (!popoverRef.current?.matches(':hover')) {
        setShowPopover(false);
      }
    }, 100);
  };

  const handlePopoverMouseEnter = () => {
    setShowPopover(true);
  };

  const handlePopoverMouseLeave = () => {
    setShowPopover(false);
    setIsHovered(false);
  };

  // Handle suggestion actions
  const handleAccept = () => {
    onAccept(suggestion.id);
    setShowPopover(false);
  };

  const handleReject = () => {
    onReject(suggestion.id);
    setShowPopover(false);
  };

  // Extract the text to highlight
  const { startOffset, endOffset, textToReplace } = suggestion;
  const highlightText = content.substring(startOffset, endOffset) || textToReplace;

  if (!isVisible || !highlightText) {
    return null;
  }

  return (
    <>
      {/* Highlight span */}
      <span
        ref={highlightRef}
        className={`
          relative inline-block cursor-pointer transition-all duration-200 ease-in-out
          border-b-2 border-dashed rounded-sm px-1 py-0.5
          ${colors.highlight}
          ${colors.hover}
          ${isHovered ? 'shadow-sm scale-105' : ''}
        `}
        style={{ zIndex }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title={`${typeDisplayName}: ${suggestion.reason}`}
      >
        {highlightText}

        {/* Small indicator for suggestion type */}
        <span
          className={`
            absolute -top-1 -right-1 w-2 h-2 rounded-full
            ${colors.highlight.split(' ')[0]}
            border border-white shadow-sm
            transition-transform duration-200
            ${isHovered ? 'scale-125' : ''}
          `}
        />
      </span>

      {/* Popover */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200"
          style={{
            top: popoverPosition.top,
            left: popoverPosition.left,
            zIndex: zIndex + 1000
          }}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
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
                  ${colors.highlight.split(' ')[0]}
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
                "{highlightText}"
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
                absolute w-3 h-3 transform rotate-45
                ${colors.popover.split(' ')[0]}
                border-l border-t
                ${colors.popover.split(' ')[1]}
              `}
              style={{
                top: popoverPosition.top > highlightRef.current?.getBoundingClientRect().bottom! + 8
                  ? '100%'
                  : '-6px',
                left: '24px',
                marginTop: popoverPosition.top > highlightRef.current?.getBoundingClientRect().bottom! + 8
                  ? '-6px'
                  : '0'
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
