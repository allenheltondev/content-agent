import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Suggestion } from '../../types';
import { useActiveSuggestionManager } from '../../hooks/useActiveSuggestionManager';
import { useOptimizedActiveSuggestionManager } from '../../hooks/useOptimizedActiveSuggestionManager';
import { ActiveSuggestionArea } from './ActiveSuggestionArea';
import { InteractiveSuggestionHighlights } from './InteractiveSuggestionHighlights';
import { VirtualizedSuggestionHighlights } from './VirtualizedSuggestionHighlights';
import { SuggestionActionFeedback } from './SuggestionActionFeedback';
import type { SuggestionActionFeedback as FeedbackType } from './SuggestionActionButtons';


/**
 * Configuration for the integrated active suggestion system
 */
export interface IntegratedActiveSuggestionConfig {
  /**
   * Whether to enable auto-advancement after suggestion resolution
   */
  enableAutoAdvance?: boolean;

  /**
   * Delay before auto-advancing to next suggestion (ms)
   */
  autoAdvanceDelay?: number;

  /**
   * Whether to enable scroll-to-active functionality
   */
  enableScrollToActive?: boolean;

  /**
   * Whether to enable smooth transitions between suggestions
   */
  enableTransitions?: boolean;

  /**
   * Whether to enable performance monitoring
   */
  enablePerformanceMonitoring?: boolean;

  /**
   * Maximum number of suggestions to process efficiently
   */
  performanceThreshold?: number;

  /**
   * Whether to enable responsive positioning for the active suggestion area
   */
  enableResponsivePositioning?: boolean;

  /**
   * Additional elements to avoid when positioning the active suggestion area
   */
  avoidElements?: string[];

  /**
   * Whether to enable performance optimizations (caching, virtualization, etc.)
   */
  enablePerformanceOptimizations?: boolean;

  /**
   * Whether to use virtualized highlighting for large suggestion sets
   */
  useVirtualizedHighlighting?: boolean;

  /**
   * Threshold for enabling virtualized highlighting
   */
  virtualizationThreshold?: number;

  /**
   * Whether to enable suggestion caching
   */
  enableCaching?: boolean;

  /**
   * Whether to enable batched state updates
   */
  enableBatchedUpdates?: boolean;

  /**
   * Whether to enable optimistic UI updates for suggestion resolution
   */
  enableOptimisticUpdates?: boolean;

  /**
   * Whether to enable batch processing for suggestion resolution
   */
  enableBatchResolution?: boolean;

  /**
   * Batch size for resolution processing
   */
  resolutionBatchSize?: number;

  /**
   * Whether to enable optimized state management
   */
  enableOptimizedState?: boolean;
}

/**
 * Props for the IntegratedActiveSuggestionSystem component
 */
export interface IntegratedActiveSuggestionSystemProps {
  /**
   * All available suggestions
   */
  suggestions: Suggestion[];

  /**
   * Full content text for context and preview
   */
  content: string;

  /**
   * Callback when a suggestion is accepted
   */
  onAcceptSuggestion: (suggestionId: string, editedText?: string) => void;

  /**
   * Callback when a suggestion is rejected
   */
  onRejectSuggestion: (suggestionId: string) => void;

  /**
   * Callback when a suggestion is edited
   */
  onEditSuggestion?: (suggestionId: string, newText: string) => void;

  /**
   * Callback when active suggestion changes
   */
  onActiveSuggestionChange?: (suggestionId: string | null) => void;

  /**
   * Callback when a suggestion is resolved (accepted or rejected)
   */
  onSuggestionResolved?: (suggestionId: string, action: 'accepted' | 'rejected') => void;

  /**
   * Callback when all suggestions are resolved
   */
  onAllSuggestionsResolved?: () => void;

  /**
   * Whether the system is currently processing a suggestion action
   */
  isProcessing?: boolean;

  /**
   * Configuration for the integrated system
   */
  config?: IntegratedActiveSuggestionConfig;

  /**
   * Additional CSS class name
   */
  className?: string;

  /**
   * Whether to show the system (can be used to hide when no suggestions)
   */
  visible?: boolean;

  /**
   * Whether to render the ActiveSuggestionArea panel. Useful to suppress the
   * floating panel while the editor has focus so the user can type uninterrupted.
   */
  showActiveArea?: boolean;
}

/**
 * Default configuration for the integrated active suggestion system
 */
const DEFAULT_CONFIG: Required<IntegratedActiveSuggestionConfig> = {
  enableAutoAdvance: true,
  autoAdvanceDelay: 300,
  enableScrollToActive: true,
  enableTransitions: true,
  enablePerformanceMonitoring: true,
  performanceThreshold: 50,
  enableResponsivePositioning: true,
  avoidElements: [],
  enablePerformanceOptimizations: true,
  useVirtualizedHighlighting: true,
  virtualizationThreshold: 50,
  enableCaching: true,
  enableBatchedUpdates: true,
  enableOptimisticUpdates: true,
  enableBatchResolution: true,
  resolutionBatchSize: 5,
  enableOptimizedState: true
};

/**
 * IntegratedActiveSuggestionSystem combines all active suggestion components
 * into a cohesive system with optimized performance and smooth data flow
 */
export const IntegratedActiveSuggestionSystem: React.FC<IntegratedActiveSuggestionSystemProps> = ({
  suggestions,
  content,
  onAcceptSuggestion,
  onRejectSuggestion,
  onEditSuggestion,
  onActiveSuggestionChange,
  onSuggestionResolved,
  onAllSuggestionsResolved,
  isProcessing = false,
  config = {},
  className = '',
  visible = true,
  showActiveArea = true
}) => {
  // Merge configuration with defaults
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config]);

  // State for action feedback
  const [actionFeedback, setActionFeedback] = useState<FeedbackType | null>(null);
  const [lastNavigationDirection, setLastNavigationDirection] = useState<'forward' | 'backward' | 'none'>('none');

  // Performance monitoring removed

  // Choose between optimized and standard manager based on configuration
  const useOptimizedManager = finalConfig.enablePerformanceOptimizations &&
    suggestions.length > finalConfig.performanceThreshold;

  // Manager configuration
  const managerConfig = {
    suggestions,
    autoAdvanceDelay: finalConfig.autoAdvanceDelay,
    enableAutoAdvance: finalConfig.enableAutoAdvance,
    enableScrollToActive: finalConfig.enableScrollToActive,
    onActiveSuggestionChange: useCallback((suggestionId: string | null) => {
      onActiveSuggestionChange?.(suggestionId);
    }, [onActiveSuggestionChange]),
    onSuggestionResolved: useCallback((suggestionId: string, _remainingCount: number) => {
      onSuggestionResolved?.(suggestionId, 'accepted'); // Default to accepted for now

      // Show feedback for resolved suggestion
      const suggestion = suggestions.find(s => s.id === suggestionId);
      if (suggestion) {
        setActionFeedback({
          type: 'accepted',
          message: `${suggestion.type} suggestion applied successfully`,
          duration: 2000,
          autoAdvance: finalConfig.enableAutoAdvance
        });
      }

      // Auto-dismiss feedback
      setTimeout(() => {
        setActionFeedback(null);
      }, 2000);
    }, [onSuggestionResolved, suggestions, finalConfig.enableAutoAdvance]),
    onAllSuggestionsResolved: useCallback(() => {
      onAllSuggestionsResolved?.();

      // Show completion feedback
      setActionFeedback({
        type: 'accepted',
        message: 'All suggestions have been reviewed!',
        duration: 3000,
        autoAdvance: false
      });

      // Auto-dismiss feedback
      setTimeout(() => {
        setActionFeedback(null);
      }, 3000);
    }, [onAllSuggestionsResolved])
  };

  // Use optimized or standard manager
  const standardManager = useActiveSuggestionManager(managerConfig);
  const optimizedManager = useOptimizedActiveSuggestionManager({
    ...managerConfig,
    enableOptimizations: true,
    enableCaching: finalConfig.enableCaching,
    enableBatchedUpdates: finalConfig.enableBatchedUpdates,
    enableLazyLoading: suggestions.length > 100,
    lazyLoadingThreshold: 100
  });

  const activeSuggestionManager = useOptimizedManager ? optimizedManager : standardManager;

  // Initialize optimized state management if enabled
  // Optimized state can be enabled later if needed

  // Removed resolution manager to avoid double-click issues - using direct parent callbacks instead

  // Handle highlight clicks from InteractiveSuggestionHighlights
  const handleHighlightClick = useCallback((suggestionId: string) => {
    activeSuggestionManager.setActiveSuggestion(suggestionId);
  }, [activeSuggestionManager]);

  // Handle navigation from ActiveSuggestionArea
  const handleNavigate = useCallback((direction: 'previous' | 'next') => {
    const success = direction === 'next'
      ? activeSuggestionManager.navigateNext()
      : activeSuggestionManager.navigatePrevious();

    if (success) {
      setLastNavigationDirection(direction === 'next' ? 'forward' : 'backward');
    }
  }, [activeSuggestionManager]);

  // Handle suggestion acceptance - simplified to avoid double-click issues
  const handleAcceptSuggestion = useCallback((suggestionId: string, editedText?: string) => {
    // Call the parent handler directly to avoid multiple resolution layers
    onAcceptSuggestion(suggestionId, editedText);

    // Mark as resolved in the active suggestion manager
    activeSuggestionManager.resolveSuggestion(suggestionId);

    // Show feedback
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      setActionFeedback({
        type: 'accepted',
        message: editedText
          ? `${suggestion.type} suggestion accepted with edits`
          : `${suggestion.type} suggestion accepted`,
        duration: 2000,
        autoAdvance: finalConfig.enableAutoAdvance
      });

      // Auto-dismiss feedback
      setTimeout(() => {
        setActionFeedback(null);
      }, 2000);
    }
  }, [onAcceptSuggestion, activeSuggestionManager, suggestions, finalConfig.enableAutoAdvance]);

  // Handle suggestion rejection - simplified to avoid double-click issues
  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    // Call the parent handler directly to avoid multiple resolution layers
    onRejectSuggestion(suggestionId);

    // Mark as resolved in the active suggestion manager
    activeSuggestionManager.resolveSuggestion(suggestionId);

    // Show feedback
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      setActionFeedback({
        type: 'rejected',
        message: `${suggestion.type} suggestion rejected`,
        duration: 2000,
        autoAdvance: finalConfig.enableAutoAdvance
      });

      // Auto-dismiss feedback
      setTimeout(() => {
        setActionFeedback(null);
      }, 2000);
    }
  }, [onRejectSuggestion, activeSuggestionManager, suggestions, finalConfig.enableAutoAdvance]);

  // Handle suggestion editing
  const handleEditSuggestion = useCallback((suggestionId: string, newText: string) => {
    onEditSuggestion?.(suggestionId, newText);
  }, [onEditSuggestion]);

  // Handle feedback dismissal
  const handleFeedbackDismiss = useCallback(() => {
    setActionFeedback(null);
  }, []);

  // Performance optimization: only render when visible and has suggestions
  const shouldRender = useMemo(() => {
    return visible && activeSuggestionManager.availableSuggestions.length > 0;
  }, [visible, activeSuggestionManager.availableSuggestions.length]);

  // Performance optimization: memoize available suggestions for highlighting
  const availableSuggestionsForHighlighting = useMemo(() => {
    return activeSuggestionManager.availableSuggestions;
  }, [activeSuggestionManager.availableSuggestions]);

  // Log performance metrics periodically (development only)
  // Perf logging removed
  useEffect(() => { return; }, []);

  // Early return if not rendering
  if (!shouldRender) {
    return null;
  }

  // Performance warning for large suggestion sets
  // Performance warning removed

  return (
    <div className={`integrated-active-suggestion-system ${className}`}>
      {/* Interactive or Virtualized Suggestion Highlights */}
      {finalConfig.useVirtualizedHighlighting && suggestions.length > finalConfig.virtualizationThreshold ? (
        <VirtualizedSuggestionHighlights
          suggestions={availableSuggestionsForHighlighting}
          activeSuggestionId={activeSuggestionManager.activeSuggestionId}
          content={content}
          onHighlightClick={handleHighlightClick}
          enableScrollToActive={finalConfig.enableScrollToActive}
          className="suggestion-highlights virtualized"
          config={{
            renderBatchSize: 20,
            virtualizationThreshold: finalConfig.virtualizationThreshold,
            enableIntersectionObserver: true,
            enableDebouncing: true,
            debounceDelay: 150
          }}
        />
      ) : (
        <InteractiveSuggestionHighlights
          suggestions={availableSuggestionsForHighlighting}
          activeSuggestionId={activeSuggestionManager.activeSuggestionId}
          content={content}
          onHighlightClick={handleHighlightClick}
          enableScrollToActive={finalConfig.enableScrollToActive}
          className="suggestion-highlights standard"
        />
      )}

      {/* Active Suggestion Area */}
      {showActiveArea && activeSuggestionManager.hasActiveSuggestion && (
        <ActiveSuggestionArea
          activeSuggestion={activeSuggestionManager.activeSuggestion}
          totalSuggestions={activeSuggestionManager.navigationContext.totalCount}
          currentIndex={activeSuggestionManager.navigationContext.currentIndex}
          onNavigate={handleNavigate}
          onAccept={handleAcceptSuggestion}
          onReject={handleRejectSuggestion}
          onEdit={handleEditSuggestion}
          isProcessing={isProcessing}
          feedback={actionFeedback}
          onFeedbackDismiss={handleFeedbackDismiss}
          fullContent={content}
          enableResponsivePositioning={finalConfig.enableResponsivePositioning}
          avoidElements={[
            '.app-header',
            '.editor-header',
            '.content-summary',
            '.editor-actions',
            ...finalConfig.avoidElements
          ]}
          enableTransitions={finalConfig.enableTransitions}
          transitionDirection={lastNavigationDirection}
          className="active-suggestion-area"
        />
      )}

      {/* Action Feedback (rendered separately for better positioning) */}
      <SuggestionActionFeedback
        feedback={actionFeedback}
        onDismiss={handleFeedbackDismiss}
      />
    </div>
  );
};

IntegratedActiveSuggestionSystem.displayName = 'IntegratedActiveSuggestionSystem';
