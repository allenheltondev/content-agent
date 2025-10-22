import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { Suggestion } from '../../types';
import { SuggestionNavigationControls } from './SuggestionNavigationControls';
import { SuggestionActionButtons } from './SuggestionActionButtons';
import { DraggableHelpTooltip } from './DraggableHelpTooltip';
import type { SuggestionActionFeedback as _FeedbackType } from './SuggestionActionButtons';

interface DraggableActiveSuggestionAreaProps {
  activeSuggestion: Suggestion;
  totalSuggestions: number;
  currentIndex: number;
  onNavigate: (direction: 'previous' | 'next') => void;
  onAccept: (suggestionId: string, editedText?: string) => void;
  onReject: (suggestionId: string) => void;
  onEdit: (suggestionId: string, newText: string) => void;
  isProcessing: boolean;
  fullContent?: string;
  onSuggestionResolved?: (suggestionId: string) => void;
}

interface Position {
  x: number;
  y: number;
}

export const DraggableActiveSuggestionArea: React.FC<DraggableActiveSuggestionAreaProps> = ({
  activeSuggestion,
  totalSuggestions,
  currentIndex,
  onNavigate,
  onAccept,
  onReject,
  onEdit,
  isProcessing,
  fullContent,
  onSuggestionResolved
}) => {
  // Early return if no active suggestion
  if (!activeSuggestion) {
    return null;
  }
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const [_lastPosition, setLastPosition] = useState<Position>({ x: 0, y: 0 });
  const [isNewSuggestion, setIsNewSuggestion] = useState(false);
  const [hasInitializedPosition, setHasInitializedPosition] = useState(false);
  const [isRepositioning, setIsRepositioning] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const positionRef = useRef<Position>({ x: 0, y: 0 });

  // Keep position ref in sync
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;

    // Don't start drag if clicking on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('textarea')) {
      return;
    }

    const rect = dragRef.current.getBoundingClientRect();
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    setDragOffset(offset);
    setIsDragging(true);
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const newPosition = {
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    };

    // Keep within viewport bounds with padding
    const padding = 10;
    const elementWidth = dragRef.current?.offsetWidth || 580;
    const elementHeight = dragRef.current?.offsetHeight || 400;

    const maxX = window.innerWidth - elementWidth - padding;
    const maxY = window.innerHeight - elementHeight - padding;

    newPosition.x = Math.max(padding, Math.min(newPosition.x, maxX));
    newPosition.y = Math.max(padding, Math.min(newPosition.y, maxY));

    setPosition(newPosition);
    positionRef.current = newPosition;
  }, [isDragging, dragOffset]);

  // Snap to edges when dragging stops
  const snapToEdge = useCallback((pos: Position) => {
    const snapThreshold = 50;
    const elementWidth = dragRef.current?.offsetWidth || 580;
    const elementHeight = dragRef.current?.offsetHeight || 400;

    let snappedPos = { ...pos };

    // Snap to left edge
    if (pos.x < snapThreshold) {
      snappedPos.x = 10;
    }
    // Snap to right edge
    else if (pos.x > window.innerWidth - elementWidth - snapThreshold) {
      snappedPos.x = window.innerWidth - elementWidth - 10;
    }

    // Snap to top edge
    if (pos.y < snapThreshold) {
      snappedPos.y = 10;
    }
    // Snap to bottom edge
    else if (pos.y > window.innerHeight - elementHeight - snapThreshold) {
      snappedPos.y = window.innerHeight - elementHeight - 10;
    }

    return snappedPos;
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      const snappedPosition = snapToEdge(position);
      setPosition(snappedPosition);
      setLastPosition(snappedPosition);
      setIsDragging(false);
    }
  }, [isDragging, position, snapToEdge]);

  const handleCollapse = useCallback(() => {
    setIsCollapsed(!isCollapsed);
  }, [isCollapsed]);

  const handleMinimize = useCallback(() => {
    setIsMinimized(!isMinimized);
  }, [isMinimized]);

  // Smart positioning near the active suggestion
  const calculateOptimalPosition = useCallback((suggestionId: string): Position => {
    try {
      const panelWidth = 580;
      const panelHeight = 400;
      const margin = 20;
      const viewportWidth = window.innerWidth || 1024;
      const viewportHeight = window.innerHeight || 768;

      // Try to find the active suggestion highlight element
      const activeHighlight = document.querySelector(`[data-suggestion-id="${suggestionId}"]`);

      if (activeHighlight) {
        const rect = activeHighlight.getBoundingClientRect();

        const centerY = rect.top + rect.height / 2;

        // Try different positions in order of preference
        const positions = [
          // Right of suggestion
          { x: rect.right + margin, y: Math.max(rect.top - 50, margin) },
          // Left of suggestion
          { x: rect.left - panelWidth - margin, y: Math.max(rect.top - 50, margin) },
          // Below suggestion
          { x: Math.max(rect.left, margin), y: rect.bottom + margin },
          // Above suggestion
          { x: Math.max(rect.left, margin), y: rect.top - panelHeight - margin },
          // Center-right of viewport
          { x: viewportWidth - panelWidth - margin, y: Math.max(centerY - panelHeight / 2, margin) },
          // Center-left of viewport
          { x: margin, y: Math.max(centerY - panelHeight / 2, margin) }
        ];

        // Find the first position that fits within viewport
        for (const pos of positions) {
          if (pos.x >= margin &&
              pos.x + panelWidth <= viewportWidth - margin &&
              pos.y >= margin &&
              pos.y + panelHeight <= viewportHeight - margin) {
            return pos;
          }
        }
      }

      // Ultimate fallback - center of viewport
      return {
        x: Math.max((viewportWidth - panelWidth) / 2, margin),
        y: Math.max((viewportHeight - panelHeight) / 2, margin)
      };
    } catch (error) {
      console.warn('Error calculating optimal position:', error);
      // Safe fallback position
      return { x: 20, y: 100 };
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    // Double-click to reset position near the active suggestion
    const newPosition = calculateOptimalPosition(activeSuggestion.id);
    setPosition(newPosition);
    setLastPosition(newPosition);
    positionRef.current = newPosition;
  }, [activeSuggestion.id, calculateOptimalPosition]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when the suggestion area is focused or no input is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement?.tagName === 'INPUT' ||
                            activeElement?.tagName === 'TEXTAREA' ||
                            (activeElement as HTMLElement)?.contentEditable === 'true';

      if (isInputFocused) return;

      switch (e.key) {
        case 'Escape':
          if (isCollapsed) setIsCollapsed(false);
          else if (isMinimized) setIsMinimized(false);
          else setIsMinimized(true);
          e.preventDefault();
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) return; // Don't interfere with copy
          setIsCollapsed(!isCollapsed);
          e.preventDefault();
          break;
        case 'm':
          if (e.ctrlKey || e.metaKey) return; // Don't interfere with other shortcuts
          setIsMinimized(!isMinimized);
          e.preventDefault();
          break;
        case 'r':
          if (e.ctrlKey || e.metaKey) return; // Don't interfere with refresh
          // Reset position near active suggestion using smart positioning
          const newPosition = calculateOptimalPosition(activeSuggestion.id);
          setPosition(newPosition);
          setLastPosition(newPosition);
          positionRef.current = newPosition;
          e.preventDefault();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isCollapsed, isMinimized, calculateOptimalPosition, activeSuggestion.id]);

  // Track previous suggestion ID to detect changes
  const prevSuggestionIdRef = useRef<string | null>(null);

  // Initialize position near the active suggestion
  useEffect(() => {
    const currentSuggestionId = activeSuggestion.id;
    const isNewSuggestion = prevSuggestionIdRef.current !== currentSuggestionId;

    if (!hasInitializedPosition) {
      // First time initialization
      const newPosition = calculateOptimalPosition(currentSuggestionId);
      setPosition(newPosition);
      setLastPosition(newPosition);
      positionRef.current = newPosition;
      setHasInitializedPosition(true);
      prevSuggestionIdRef.current = currentSuggestionId;
    } else if (isNewSuggestion) {
      // Suggestion changed - animate from current position to new position
      const currentPos = positionRef.current;
      const newPosition = calculateOptimalPosition(currentSuggestionId);

      // Only animate if the new position is significantly different
      const distance = Math.sqrt(
        Math.pow(newPosition.x - currentPos.x, 2) +
        Math.pow(newPosition.y - currentPos.y, 2)
      );

      if (distance > 50) { // Only animate if moving more than 50px
        setIsAnimating(true);
        setIsRepositioning(true);

        // Use CSS transition to animate to new position
        setPosition(newPosition);
        positionRef.current = newPosition;

        // Clear animation indicators after animation
        setTimeout(() => {
          setIsAnimating(false);
          setIsRepositioning(false);
        }, 500);
      } else {
        // Small movement, just update position without animation
        setPosition(newPosition);
        positionRef.current = newPosition;
      }

      prevSuggestionIdRef.current = currentSuggestionId;
    }
  }, [activeSuggestion.id, hasInitializedPosition, calculateOptimalPosition]);

  // Handle window resize to keep panel in bounds
  useEffect(() => {
    const handleResize = () => {
      const panelWidth = 580;
      const panelHeight = 400;
      const margin = 20;

      setPosition(currentPos => {
        const newPos = { ...currentPos };

        // Ensure panel stays within new viewport bounds
        if (newPos.x + panelWidth > window.innerWidth - margin) {
          newPos.x = Math.max(window.innerWidth - panelWidth - margin, margin);
        }
        if (newPos.y + panelHeight > window.innerHeight - margin) {
          newPos.y = Math.max(window.innerHeight - panelHeight - margin, margin);
        }
        if (newPos.x < margin) {
          newPos.x = margin;
        }
        if (newPos.y < margin) {
          newPos.y = margin;
        }

        return newPos;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pulse animation for new suggestions
  useEffect(() => {
    setIsNewSuggestion(true);
    const timer = setTimeout(() => setIsNewSuggestion(false), 600);
    return () => clearTimeout(timer);
  }, [activeSuggestion.id]);

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

  const suggestionColor = getSuggestionTypeColor(activeSuggestion.type);
  const colorTheme = {
    blue:   { bg: '#eff6ff', primary: '#3b82f6', chipBg: '#dbeafe', chipText: '#1e40af' },
    purple: { bg: '#faf5ff', primary: '#9333ea', chipBg: '#ede9fe', chipText: '#5b21b6' },
    orange: { bg: '#fff7ed', primary: '#f97316', chipBg: '#ffedd5', chipText: '#9a3412' },
    green:  { bg: '#f0fdf4', primary: '#22c55e', chipBg: '#dcfce7', chipText: '#166534' },
    red:    { bg: '#fef2f2', primary: '#ef4444', chipBg: '#fee2e2', chipText: '#7f1d1d' },
    gray:   { bg: '#f9fafb', primary: '#6b7280', chipBg: '#f3f4f6', chipText: '#374151' }
  }[suggestionColor] || { bg: '#f9fafb', primary: '#6b7280', chipBg: '#f3f4f6', chipText: '#374151' };

  const navigationContext = {
    currentIndex: Math.max(0, currentIndex),
    totalCount: totalSuggestions,
    hasNext: currentIndex < totalSuggestions - 1,
    hasPrevious: currentIndex > 0
  };

  // Don't render if minimized
  if (isMinimized) {
    return (
      <div
        className="bg-white rounded-lg shadow-lg border border-gray-200 pointer-events-auto hover:shadow-xl transition-shadow cursor-pointer"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: '250px',
          height: '40px',
          zIndex: 2000
        }}
        onClick={handleMinimize}
        title="Click to restore suggestion panel"
      >
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Suggestion {currentIndex + 1}/{totalSuggestions}
          </span>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8l4-4 4 4m0 8l-4 4-4-4" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={dragRef}
      className={`
        bg-white rounded-lg shadow-lg border border-gray-200
        ${isDragging ? 'shadow-2xl scale-105 rotate-1' : 'hover:shadow-xl'}
        ${isNewSuggestion ? 'animate-pulse ring-2 ring-blue-200' : ''}
        ${isRepositioning ? 'ring-2 ring-green-200' : ''}
        pointer-events-auto
        ${isCollapsed ? 'max-h-16' : ''}
        ${!hasInitializedPosition ? 'animate-in fade-in slide-in-from-right-4 duration-300' : ''}
      `}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: '580px',
        maxHeight: isCollapsed ? '64px' : '600px',
        zIndex: 2000,
        cursor: isDragging ? 'grabbing' : 'default',
        transform: isDragging ? 'scale(1.05) rotate(1deg)' : 'scale(1) rotate(0deg)',
        transition: isDragging ? 'none' : isAnimating ? 'left 0.5s cubic-bezier(0.4, 0, 0.2, 1), top 0.5s cubic-bezier(0.4, 0, 0.2, 1)' : 'all 0.2s ease-out'
      }}
      data-suggestion-area="true"
      onDoubleClick={handleDoubleClick}
      title={isRepositioning ? "Auto-repositioned near suggestion" : "Double-click to reset position"}
    >
      {/* Draggable Header */}
      <div
        className={`suggestion-header px-6 py-4 border-b border-gray-200 rounded-t-lg flex items-center justify-between cursor-grab active:cursor-grabbing select-none`}
        style={{ backgroundColor: colorTheme.bg }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: colorTheme.primary }} />
            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-900 capitalize">
            {activeSuggestion.type} Suggestion
          </span>
          <span
            className="px-2 py-1 text-xs font-medium rounded-full"
            style={{ backgroundColor: colorTheme.chipBg, color: colorTheme.chipText }}
          >
            {activeSuggestion.priority || 'medium'}
          </span>
        </div>

        {/* Controls and Navigation */}
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-600 font-medium">
            {navigationContext.currentIndex + 1} of {navigationContext.totalCount}
          </div>
          <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            {navigationContext.totalCount} active
          </div>

          {/* Control buttons */}
          <div className="flex items-center space-x-1 ml-2">
            <button
              onClick={handleCollapse}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title={isCollapsed ? "Expand (C)" : "Collapse (C)"}
            >
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={isCollapsed ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
              </svg>
            </button>
            <button
              onClick={handleMinimize}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="Minimize (M)"
            >
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <DraggableHelpTooltip />
          </div>
        </div>
      </div>

      {/* Collapsible content */}
      {!isCollapsed && (
        <>
          {/* Suggestion content */}
          <div className="suggestion-content p-6 max-h-80 overflow-y-auto">
            {/* Side-by-side comparison */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Original text */}
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Original
                </div>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border min-h-[60px]">
                  <span className="text-gray-400">{activeSuggestion.contextBefore}</span>
                  <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded font-medium">
                    {activeSuggestion.textToReplace}
                  </span>
                  <span className="text-gray-400">{activeSuggestion.contextAfter}</span>
                </div>
              </div>

              {/* Suggested replacement */}
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Suggested
                </div>
                <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 border min-h-[60px]">
                  <span className="text-gray-400">{activeSuggestion.contextBefore}</span>
                  <span className={`px-1.5 py-0.5 rounded font-medium`} style={{ backgroundColor: colorTheme.chipBg, color: colorTheme.chipText }}>
                    {activeSuggestion.replaceWith}
                  </span>
                  <span className="text-gray-400">{activeSuggestion.contextAfter}</span>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Reason
              </div>
              <div className="text-sm text-gray-700 bg-blue-50 rounded-lg px-4 py-3 border border-blue-200">
                {activeSuggestion.reason}
              </div>
            </div>
          </div>

          {/* Navigation controls */}
          <div className="suggestion-navigation px-6 py-4 border-t border-gray-200 bg-gray-50">
            <SuggestionNavigationControls
              navigationContext={navigationContext}
              onNavigate={onNavigate}
              isProcessing={isProcessing}
              showKeyboardHints={true}
            />
          </div>

          {/* Action buttons */}
          <div className="suggestion-actions px-6 py-4 border-t border-gray-200 bg-white rounded-b-lg relative">
            <SuggestionActionButtons
              suggestion={activeSuggestion}
              onAccept={onAccept}
              onReject={onReject}
              onEdit={onEdit}
              isProcessing={isProcessing}
              allowEditing={true}
              fullContent={fullContent}
              onSuggestionResolved={onSuggestionResolved}
            />

            {/* Resize handle */}
            <div className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize opacity-30 hover:opacity-60 transition-opacity">
              <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM18 18H16V16H18V18ZM14 22H12V20H14V22ZM22 14H20V12H22V14Z"/>
              </svg>
            </div>
          </div>
        </>
      )}


    </div>
  );
};
