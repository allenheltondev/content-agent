import React, { useMemo, useEffect } from 'react';
import type { Suggestion } from '../../types';
import { SuggestionNavigationControls } from './SuggestionNavigationControls';
import { SuggestionActionButtons } from './SuggestionActionButtons';
import { SuggestionActionFeedback } from './SuggestionActionFeedback';
import type { SuggestionActionFeedback as FeedbackType } from './SuggestionActionButtons';
import { useActiveSuggestionAreaPositioning } from '../../hooks/useResponsivePositioning';
import { useActiveSuggestionTransitions } from '../../hooks/useSuggestionTransitions';
import './ActiveSuggestionArea.css';

/**
 * Configuration for ActiveSuggestionArea positioning and display
 */
export interface ActiveSuggestionAreaConfig {
  position: 'floating' | 'sidebar' | 'bottom';
  width: string;
  maxHeight: string;
  offset: {
    top?: string;
    right?: string;
    bottom?: string;
  };
}

/**
 * Navigation context for the active suggestion
 */
export interface SuggestionNavigationContext {
  currentIndex: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Props for the ActiveSuggestionArea component
 */
export interface ActiveSuggestionAreaProps {
  activeSuggestion: Suggestion | null;
  totalSuggestions: number;
  currentIndex: number;
  onNavigate: (direction: 'previous' | 'next') => void;
  onAccept: (suggestionId: string, editedText?: string) => void;
  onReject: (suggestionId: string) => void;
  onEdit: (suggestionId: string, newText: string) => void;
  isProcessing: boolean;
  className?: string;
  config?: Partial<ActiveSuggestionAreaConfig>;
  feedback?: FeedbackType | null;
  onFeedbackDismiss?: () => void;
  fullContent?: string; // Full content for enhanced preview
  enableResponsivePositioning?: boolean; // Enable responsive positioning
  avoidElements?: string[]; // Additional elements to avoid overlapping
  enableTransitions?: boolean; // Enable smooth transitions
  transitionDirection?: 'forward' | 'backward' | 'none'; // Direction for transitions
}

/**
 * Default configuration for the ActiveSuggestionArea
 */
const DEFAULT_CONFIG: ActiveSuggestionAreaConfig = {
  position: 'floating',
  width: '400px',
  maxHeight: '300px',
  offset: {
    top: '20px',
    right: '20px'
  }
};

/**
 * Get suggestion type color for visual consistency
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
 * ActiveSuggestionArea component displays the currently active suggestion with navigation and actions
 */
export const ActiveSuggestionArea: React.FC<ActiveSuggestionAreaProps> = ({
  activeSuggestion,
  totalSuggestions,
  currentIndex,
  onNavigate,
  onAccept,
  onReject,
  onEdit,
  isProcessing,
  className = '',
  config = {},
  feedback,
  onFeedbackDismiss,
  fullContent,
  enableResponsivePositioning = true,
  avoidElements = [],
  enableTransitions = true,
  transitionDirection = 'none'
}) => {
  // Do not render until we have an active suggestion
  if (!activeSuggestion) {
    return null;
  }
  // Merge config with defaults
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config,
    offset: {
      ...DEFAULT_CONFIG.offset,
      ...config.offset
    }
  }), [config]);

  // Initialize responsive positioning
  const { positioning, viewport } = useActiveSuggestionAreaPositioning({
    avoidElements: [
      '.app-header',
      '.editor-header',
      '.content-summary',
      '.editor-actions',
      ...avoidElements
    ],
    positions: {
      // Override positions if config specifies a fixed position
      ...(config.position && {
        mobile: { strategy: config.position },
        tablet: { strategy: config.position },
        desktop: { strategy: config.position },
        wide: { strategy: config.position }
      })
    }
  });

  // Initialize transitions
  const {
    transitionState,
    startTransition,
    startProcessing,
    getTransitionClasses,
    getTransitionStyles
  } = useActiveSuggestionTransitions({
    enableFade: true,
    enableSlide: true,
    enableStagger: true
  });

  // Calculate navigation context
  const navigationContext = useMemo((): SuggestionNavigationContext => ({
    currentIndex: Math.max(0, currentIndex),
    totalCount: totalSuggestions,
    hasNext: currentIndex < totalSuggestions - 1,
    hasPrevious: currentIndex > 0
  }), [currentIndex, totalSuggestions]);

  // Handle suggestion changes for transitions
  useEffect(() => {
    if (enableTransitions) {
      startTransition(
        activeSuggestion?.id || null,
        transitionDirection,
        'navigation'
      );
    }
  }, [activeSuggestion?.id, enableTransitions, startTransition, transitionDirection]);

  // Handle processing state
  useEffect(() => {
    if (isProcessing && enableTransitions) {
      startProcessing();
    }
  }, [isProcessing, enableTransitions, startProcessing]);

  // Don't render if no active suggestion and not transitioning
  if (!activeSuggestion && (!enableTransitions || transitionState.state === 'idle')) {
    return null;
  }

  const suggestionColor = getSuggestionTypeColor(activeSuggestion.type);
  const colorTheme = useMemo(() => {
    const map: Record<string, { bg: string; primary: string; chipBg: string; chipText: string }> = {
      blue:   { bg: '#eff6ff', primary: '#3b82f6', chipBg: '#dbeafe', chipText: '#1e40af' },
      purple: { bg: '#faf5ff', primary: '#9333ea', chipBg: '#ede9fe', chipText: '#5b21b6' },
      orange: { bg: '#fff7ed', primary: '#f97316', chipBg: '#ffedd5', chipText: '#9a3412' },
      green:  { bg: '#f0fdf4', primary: '#22c55e', chipBg: '#dcfce7', chipText: '#166534' },
      red:    { bg: '#fef2f2', primary: '#ef4444', chipBg: '#fee2e2', chipText: '#7f1d1d' },
      gray:   { bg: '#f9fafb', primary: '#6b7280', chipBg: '#f3f4f6', chipText: '#374151' }
    };
    return map[suggestionColor] ?? map.gray;
  }, [suggestionColor]);

  // Derive safe display values with sensible fallbacks
  const derived = useMemo(() => {
    const start = Math.max(0, activeSuggestion.startOffset || 0);
    const end = Math.max(start, activeSuggestion.endOffset || start);
    const content = fullContent || '';
    const clampEnd = Math.min(end, content.length);
    const clampStart = Math.min(start, clampEnd);

    const before = activeSuggestion.contextBefore && activeSuggestion.contextBefore.length > 0
      ? activeSuggestion.contextBefore
      : (content ? content.slice(Math.max(0, clampStart - 60), clampStart) : '');
    const originalText = activeSuggestion.textToReplace && activeSuggestion.textToReplace.length > 0
      ? activeSuggestion.textToReplace
      : (content ? content.slice(clampStart, clampEnd) : '');
    const after = activeSuggestion.contextAfter && activeSuggestion.contextAfter.length > 0
      ? activeSuggestion.contextAfter
      : (content ? content.slice(clampEnd, Math.min(content.length, clampEnd + 60)) : '');

    const replacement = activeSuggestion.replaceWith || '';
    const reason = activeSuggestion.reason || 'Suggested improvement';
    const priority = activeSuggestion.priority || 'medium';

    return { before, originalText, after, replacement, reason, priority };
  }, [activeSuggestion, fullContent]);

  // Generate positioning styles based on responsive positioning or config
  const positioningStyles = useMemo(() => {
    if (enableResponsivePositioning) {
      return positioning.styles;
    }

    // Fallback to original config-based positioning
    const styles: React.CSSProperties = {
      width: finalConfig.width,
      maxHeight: finalConfig.maxHeight
    };

    switch (finalConfig.position) {
      case 'floating':
        return {
          ...styles,
          position: 'fixed' as const,
          top: finalConfig.offset.top,
          right: finalConfig.offset.right,
          zIndex: 50
        };
      case 'bottom':
        return {
          ...styles,
          width: '100%',
          marginTop: '1rem'
        };
      case 'sidebar':
      default:
        return styles;
    }
  }, [enableResponsivePositioning, positioning.styles, finalConfig]);

  // Generate responsive class names
  const responsiveClassName = useMemo(() => {
    if (!enableResponsivePositioning) {
      return '';
    }

    const baseClasses = positioning.className;
    const responsiveClasses = [
      // Mobile-specific classes
      viewport.breakpoint === 'mobile' ? 'mobile-suggestion-area' : '',
      // Tablet-specific classes
      viewport.breakpoint === 'tablet' ? 'tablet-suggestion-area' : '',
      // Desktop-specific classes
      viewport.breakpoint === 'desktop' ? 'desktop-suggestion-area' : '',
      // Wide screen classes
      viewport.breakpoint === 'wide' ? 'wide-suggestion-area' : '',
      // Orientation classes
      viewport.orientation === 'portrait' ? 'portrait-mode' : 'landscape-mode',
      // Strategy classes
      positioning.isFloating ? 'floating-suggestion' : 'inline-suggestion'
    ].filter(Boolean).join(' ');

    return `${baseClasses} ${responsiveClasses}`.trim();
  }, [enableResponsivePositioning, positioning, viewport]);

  // Generate transition class names
  const transitionClassName = useMemo(() => {
    if (!enableTransitions) return '';
    return getTransitionClasses();
  }, [enableTransitions, getTransitionClasses]);

  // Generate combined styles (positioning + transitions)
  const combinedStyles = useMemo(() => {
    const baseStyles = positioningStyles;
    const transitionStyles = enableTransitions ? getTransitionStyles() : {};

    return {
      ...baseStyles,
      ...transitionStyles
    };
  }, [positioningStyles, enableTransitions, getTransitionStyles]);

  return (
    <>
      <div
        className={`
          bg-white rounded-lg shadow-lg border border-gray-200
          ${responsiveClassName}
          ${transitionClassName}
          ${isProcessing ? 'suggestion-resolving' : ''}
          ${className}
        `}
        style={{ ...combinedStyles, zIndex: 2000 }}
        data-suggestion-area="true"
        data-viewport-breakpoint={viewport.breakpoint}
        data-positioning-strategy={positioning.strategy}
        data-transition-state={transitionState.state}
      >
      {/* Header with navigation context */}
      <div
        className={`suggestion-header px-4 py-3 border-b border-gray-200 rounded-t-lg flex items-center justify-between`}
        style={{ backgroundColor: colorTheme.bg }}
      >
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: colorTheme.primary }} />
          <span className="text-sm font-medium text-gray-900 capitalize">
            {activeSuggestion.type} Suggestion
          </span>
          <span
            className="px-2 py-1 text-xs font-medium rounded-full"
            style={{ backgroundColor: colorTheme.chipBg, color: colorTheme.chipText }}
          >
            {activeSuggestion.priority || 'medium'}
          </span>
          <span
            className="px-2 py-1 text-xs font-medium rounded-full border"
            style={{ backgroundColor: '#ffffff', color: '#374151', borderColor: '#e5e7eb' }}
          >
            {activeSuggestion.type}
          </span>
        </div>

        {/* Navigation indicator */}
        <div className="text-sm text-gray-600">
          {navigationContext.currentIndex + 1} of {navigationContext.totalCount}
        </div>
      </div>

      {/* Suggestion content */}
      <div className="suggestion-content p-4">
        {/* Original text context */}
        <div className="mb-3 stagger-item stagger-animate">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Original Text
          </div>
          <div className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 border">
            <span className="text-gray-400">{derived.before}</span>
            <span className="bg-red-100 text-red-800 px-1 rounded">
              {derived.originalText}
            </span>
            <span className="text-gray-400">{derived.after}</span>
          </div>
        </div>

        {/* Suggested replacement */}
        <div className="mb-3 stagger-item stagger-animate">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Suggested Change
          </div>
          <div className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 border">
            <span className="text-gray-400">{derived.before}</span>
            <span className={`px-1 rounded`} style={{ backgroundColor: colorTheme.chipBg, color: colorTheme.chipText }}>
              {derived.replacement}
            </span>
            <span className="text-gray-400">{derived.after}</span>
          </div>
        </div>

        {/* Reason */}
        <div className="mb-4 stagger-item stagger-animate">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            Reason
          </div>
          <div className="text-sm text-gray-700">
            {derived.reason}
          </div>
        </div>
      </div>

      {/* Navigation controls */}
      <div className="suggestion-navigation px-4 py-3 border-t border-gray-200 bg-gray-50">
        <SuggestionNavigationControls
          navigationContext={navigationContext}
          onNavigate={onNavigate}
          isProcessing={isProcessing}
          showKeyboardHints={finalConfig.position === 'floating'}
        />
      </div>

      {/* Action buttons */}
      <div className="suggestion-actions px-4 py-3 border-t border-gray-200 bg-white rounded-b-lg">
        <SuggestionActionButtons
          suggestion={activeSuggestion}
          onAccept={onAccept}
          onReject={onReject}
          onEdit={onEdit}
          isProcessing={isProcessing}
          allowEditing={true}
          fullContent={fullContent}
        />
      </div>
    </div>

    {/* Feedback overlay */}
    <SuggestionActionFeedback
      feedback={feedback ?? null}
      onDismiss={onFeedbackDismiss}
    />
  </>
  );
};

ActiveSuggestionArea.displayName = 'ActiveSuggestionArea';
