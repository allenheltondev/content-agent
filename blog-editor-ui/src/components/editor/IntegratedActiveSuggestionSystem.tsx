import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Suggestion } from '../../types';
import { useActiveSuggestionManager } from '../../hooks/useActiveSuggestionManager';
import { useOptimizedActiveSuggestionManager } from '../../hooks/useOptimizedActiveSuggestionManager';
import { useSuggestionResolutionManager } from '../../hooks/useSuggestionResolutionManager';
import { ActiveSuggestionArea } from './ActiveSuggestionArea';
import { InteractiveSuggestionHighlights } from './InteractiveSuggestionHighlights';
import { VirtualizedSuggestionHighlights } from './VirtualizedSuggestionHighlights';
import { SuggestionActionFeedback } from './SuggestionActionFeedback';
import type { SuggestionActionFeedback as FeedbackType } from './SuggestionActionButtons';
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor';

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
  visible = true
}) => {
  // Merge configuration with defaults
  const finalConfig = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...config
  }), [config]);

  // State for action feedback
  const [actionFeedback, setActionFeedback] = useState<FeedbackType | null>(null);
  const [lastNavigationDirection, setLastNavigationDirection] = useState<'forward' | 'backward' | 'none'>('none');

  // Performance monitoring
  const { startMeasurement, endMeasurement, getMetrics } = usePerformanceMonitor({
    enabled: finalConfig.enablePerformanceMonitoring,
    thresholds: {
      navigation: 100, // 100ms threshold for navigation
      resolution: 200, // 200ms threshold for suggestion resolution
      rendering: 50    // 50ms threshold for rendering
    }
  });

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
      // Performance measurement for suggestion changes
      if (finalConfig.enablePerformanceMonitoring) {
        startMeasurement('navigation');
      }

      onActiveSuggestionChange?.(suggestionId);

      if (finalConfig.enablePerformanceMonitoring) {
        endMeasurement('navigation');
      }
    }, [onActiveSuggestionChange, finalConfig.enablePerformanceMonitoring, startMeasurement, endMeasurement]),
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

  // Initialize suggestion resolution manager for optimistic updates and batch processing
  const resolutionManager = useSuggestionResolutionManager(
    suggestions,
    async (suggestionId: string, editedText?: string) => {
      await Promise.resolve(onAcceptSuggestion(suggestionId, editedText));
    },
    async (suggestionId: string) => {
      await Promise.resolve(onRejectSuggestion(suggestionId));
    },
    {
      enableOptimisticUpdates: finalConfig.enableOptimisticUpdates,
      enableBatchProcessing: finalConfig.enableBatchResolution,
      batchSize: finalConfig.resolutionBatchSize,
      batchDelay: 500,
      enableAutoRetry: true,
      maxRetries: 3,
      enablePerformanceMonitoring: finalConfig.enablePerformanceMonitoring,
      onResolutionSuccess: (action) => {
        // Show success feedback
        const suggestion = suggestions.find(s => s.id === action.suggestionId);
        if (suggestion) {
          setActionFeedback({
            type: 'accepted',
            message: action.editedText
              ? `${suggestion.type} suggestion accepted with edits`
              : `${suggestion.type} suggestion ${action.action}ed`,
            duration: 2000,
            autoAdvance: finalConfig.enableAutoAdvance
          });

          // Auto-dismiss feedback
          setTimeout(() => {
            setActionFeedback(null);
          }, 2000);
        }

        // Mark as resolved in the manager
        activeSuggestionManager.resolveSuggestion(action.suggestionId);
      },
      onResolutionFailure: (action, error) => {
        // Show error feedback
        setActionFeedback({
          type: 'rejected',
          message: `Failed to ${action.action} suggestion: ${error}`,
          duration: 3000,
          autoAdvance: false
        });

        // Auto-dismiss error feedback
        setTimeout(() => {
          setActionFeedback(null);
        }, 3000);
      }
    }
  );

  // Handle highlight clicks from InteractiveSuggestionHighlights
  const handleHighlightClick = useCallback((suggestionId: string) => {
    if (finalConfig.enablePerformanceMonitoring) {
      startMeasurement('navigation');
    }

    activeSuggestionManager.setActiveSuggestion(suggestionId);
  if(finalConfig.enablePerformanceMonitoring) {
      endMeasurement('navigation');
    }
  }, [activeSuggestionManager, finalConfig.enablePerformanceMonitoring, startMeasurement, endMeasurement]);

  // Handle navigation from ActiveSuggestionArea
  const handleNavigate = useCallback((direction: 'previous' | 'next') => {
    if (finalConfig.enablePerformanceMonitoring) {
      startMeasurement('navigation');
    }

    const success = direction === 'next'
      ? activeSuggestionManager.navigateNext()
      : activeSuggestionManager.navigatePrevious();

    if (success) {
      setLastNavigationDirection(direction === 'next' ? 'forward' : 'backward');
    }

    if (finalConfig.enablePerformanceMonitoring) {
      endMeasurement('navigation');
    }
  }, [activeSuggestionManager, finalConfig.enablePerformanceMonitoring, startMeasurement, endMeasurement]);

  // Handle suggestion acceptance with optimized resolution
  const handleAcceptSuggestion = useCallback((suggestionId: string, editedText?: string) => {
    if (finalConfig.enablePerformanceMonitoring) {
      startMeasurement('resolution');
    }

    // Use resolution manager for optimistic updates and batch processing
    resolutionManager.acceptSuggestion(suggestionId, editedText);

    if (finalConfig.enablePerformanceMonitoring) {
      endMeasurement('resolution');
    }
  }, [resolutionManager, finalConfig.enablePerformanceMonitoring, startMeasurement, endMeasurement]);

  // Handle suggestion rejection with optimized resolution
  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    if (finalConfig.enablePerformanceMonitoring) {
      startMeasurement('resolution');
    }

    // Use resolution manager for optimistic updates and batch processing
    resolutionManager.rejectSuggestion(suggestionId);

    if (finalConfig.enablePerformanceMonitoring) {
      endMeasurement('resolution');
    }
  }, [resolutionManager, finalConfig.enablePerformanceMonitoring, startMeasurement, endMeasurement]);

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
    // Use resolution manager's available suggestions if optimistic updates are enabled
    if (finalConfig.enableOptimisticUpdates) {
      return resolutionManager.availableSuggestions;
    }
    return activeSuggestionManager.availableSuggestions;
  }, [finalConfig.enableOptimisticUpdates, resolutionManager.availableSuggestions, activeSuggestionManager.availableSuggestions]);

  // Log performance metrics periodically (development only)
  useEffect(() => {
    if (finalConfig.enablePerformanceMonitoring && process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const metrics = typeof getMetrics === 'function' ? getMetrics() : {} as any;
        const navCount = (metrics as any)?.navigation?.count ?? 0;
        const resCount = (metrics as any)?.resolution?.count ?? 0;
        if (navCount > 0 || resCount > 0) {
          console.log('Active Suggestion System Performance:', metrics);
        }
      }, 10000); // Log every 10 seconds

      return () => clearInterval(interval);
    }
  }, [finalConfig.enablePerformanceMonitoring, getMetrics]);

  // Early return if not rendering
  if (!shouldRender) {
    return null;
  }

  // Performance warning for large suggestion sets
  if (finalConfig.enablePerformanceMonitoring &&
      suggestions.length > finalConfig.performanceThreshold) {
    console.warn(
      `Large suggestion set detected (${suggestions.length} suggestions). ` +
      `Consider implementing virtualization for better performance.`
    );
  }

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
      {activeSuggestionManager.hasActiveSuggestion && (
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
