import React, { useState } from 'react';

interface DraggableHelpTooltipProps {
  className?: string;
}

export const DraggableHelpTooltip: React.FC<DraggableHelpTooltipProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        className="p-1 hover:bg-gray-200 rounded transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        title="Keyboard shortcuts"
      >
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-lg">
          <div className="space-y-1">
            <div><kbd className="bg-gray-700 px-1 rounded">C</kbd> Collapse/Expand</div>
            <div><kbd className="bg-gray-700 px-1 rounded">M</kbd> Minimize</div>
            <div><kbd className="bg-gray-700 px-1 rounded">R</kbd> Reset Position</div>
            <div><kbd className="bg-gray-700 px-1 rounded">ESC</kbd> Toggle States</div>
            <div className="text-gray-300">Double-click header to reset</div>
          </div>
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};
