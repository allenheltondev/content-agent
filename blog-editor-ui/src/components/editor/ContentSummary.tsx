
import { memo } from 'react';

export interface ContentSummaryProps {
  summary?: string;
  isLoading?: boolean;
  className?: string;
  position?: 'above-content' | 'sidebar';
  prominence?: 'high' | 'medium' | 'low';
}

interface SummaryLoadingSkeletonProps {
  className?: string;
  position?: 'above-content' | 'sidebar';
  prominence?: 'high' | 'medium' | 'low';
}

/**
 * Loading skeleton component for summary loading state
 */
const SummaryLoadingSkeleton = memo(({
  className = '',
  position = 'sidebar',
  prominence = 'medium'
}: SummaryLoadingSkeletonProps) => {
  // Dynamic styling based on position and prominence
  const getContainerStyles = () => {
    if (position === 'above-content') {
      const prominenceStyles = {
        high: "bg-blue-50 border-2 border-blue-200 rounded-xl",
        medium: "bg-slate-50 border border-slate-200 rounded-lg",
        low: "bg-slate-50 border border-slate-200 rounded-lg"
      };
      return prominenceStyles[prominence];
    }
    return "bg-slate-50 border border-slate-200 rounded-lg";
  };

  const getPaddingStyles = () => {
    if (position === 'above-content') {
      const paddingStyles = {
        high: "p-6 sm:p-8",
        medium: "p-5 sm:p-6",
        low: "p-4 sm:p-5"
      };
      return paddingStyles[prominence];
    }
    return "p-4 sm:p-5";
  };

  const getIconSize = () => {
    if (position === 'above-content') {
      const iconSizes = {
        high: "w-6 h-6",
        medium: "w-5 h-5",
        low: "w-4 h-4"
      };
      return iconSizes[prominence];
    }
    return "w-4 h-4";
  };

  const getTitleWidth = () => {
    if (position === 'above-content') {
      const titleWidths = {
        high: "w-40",
        medium: "w-36",
        low: "w-32"
      };
      return titleWidths[prominence];
    }
    return "w-32";
  };

  const getTextHeight = () => {
    if (position === 'above-content') {
      const textHeights = {
        high: "h-5",
        medium: "h-4",
        low: "h-4"
      };
      return textHeights[prominence];
    }
    return "h-4";
  };

  return (
    <div className={`animate-fade-in ${className}`} role="status" aria-label="Loading content summary">
      <div className={`${getContainerStyles()} ${getPaddingStyles()}`}>
        <div className="flex items-center space-x-2 mb-3 animate-slide-in">
          <div className={`${getIconSize()} loading-shimmer rounded`}></div>
          <div className={`${getTextHeight()} loading-shimmer rounded ${getTitleWidth()}`}></div>
        </div>
        <div className="space-y-2.5">
          <div className={`${getTextHeight()} loading-shimmer rounded w-full animate-fade-in stagger-1`}></div>
          <div className={`${getTextHeight()} loading-shimmer rounded w-5/6 animate-fade-in stagger-2`}></div>
          <div className={`${getTextHeight()} loading-shimmer rounded w-4/5 animate-fade-in stagger-3`}></div>
        </div>
      </div>
    </div>
  );
});

SummaryLoadingSkeleton.displayName = 'SummaryLoadingSkeleton';

/**
 * ContentSummary component displays a 3-sentence summary of the current content version
 * Provides users with a quick overview of their content's key points and themes
 * Supports different positioning and prominence levels for enhanced visual hierarchy
 */
export const ContentSummary = memo(({
  summary,
  isLoading = false,
  className = '',
  position = 'sidebar',
  prominence = 'medium'
}: ContentSummaryProps) => {
  // Show loading skeleton while summary is loading
  if (isLoading) {
    return <SummaryLoadingSkeleton className={className} position={position} prominence={prominence} />;
  }

  // Gracefully handle missing summary - render nothing
  if (!summary || summary.trim() === '') {
    return null;
  }

  // Dynamic styling based on position and prominence
  const getContainerStyles = () => {
    const baseStyles = "content-summary transition-all duration-300 ease-out animate-fade-in hover-lift";

    if (position === 'above-content') {
      const prominenceStyles = {
        high: "bg-blue-50 border-2 border-blue-200 rounded-xl shadow-lg hover:shadow-xl hover:border-blue-300",
        medium: "bg-slate-50 border border-slate-200 rounded-lg shadow-md hover:shadow-lg hover:border-slate-300",
        low: "bg-slate-50 border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:border-slate-300"
      };
      return `${baseStyles} ${prominenceStyles[prominence]}`;
    }

    // Sidebar styling (existing)
    return `${baseStyles} bg-slate-50 border border-slate-200 rounded-lg shadow-sm hover:shadow-md hover:border-slate-300`;
  };

  const getPaddingStyles = () => {
    if (position === 'above-content') {
      const paddingStyles = {
        high: "p-6 sm:p-8",
        medium: "p-5 sm:p-6",
        low: "p-4 sm:p-5"
      };
      return paddingStyles[prominence];
    }
    return "p-4 sm:p-5";
  };

  const getIconStyles = () => {
    if (position === 'above-content') {
      const iconStyles = {
        high: "w-6 h-6 text-blue-600",
        medium: "w-5 h-5 text-slate-600",
        low: "w-4 h-4 text-slate-600"
      };
      return iconStyles[prominence];
    }
    return "w-4 h-4 text-slate-600";
  };

  const getTitleStyles = () => {
    if (position === 'above-content') {
      const titleStyles = {
        high: "text-lg font-bold text-blue-900",
        medium: "text-base font-semibold text-slate-800",
        low: "text-sm font-semibold text-slate-700"
      };
      return titleStyles[prominence];
    }
    return "text-sm font-semibold text-slate-700";
  };

  const getTextStyles = () => {
    if (position === 'above-content') {
      const textStyles = {
        high: "text-base sm:text-lg text-slate-800 leading-relaxed sm:leading-8 font-medium",
        medium: "text-sm sm:text-base text-slate-700 leading-relaxed sm:leading-7 font-normal",
        low: "text-sm text-slate-700 leading-relaxed font-normal"
      };
      return textStyles[prominence];
    }
    return "text-sm sm:text-base text-slate-700 leading-relaxed sm:leading-7 font-normal";
  };

  const getSpacingStyles = () => {
    if (position === 'above-content') {
      const spacingStyles = {
        high: "mb-4",
        medium: "mb-3",
        low: "mb-3"
      };
      return spacingStyles[prominence];
    }
    return "mb-3";
  };

  return (
    <div className={`${getContainerStyles()} ${className}`} role="region" aria-labelledby="content-summary-title">
      <div className={getPaddingStyles()}>
        <div className={`flex items-center space-x-2 ${getSpacingStyles()} animate-slide-in`}>
          <svg
            className={`${getIconStyles()} flex-shrink-0 transition-transform duration-200 hover:scale-110`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 id="content-summary-title" className={`${getTitleStyles()} transition-colors duration-200`}>
            Content Summary
          </h3>
        </div>
        <p className={`${getTextStyles()} animate-slide-up stagger-1 transition-colors duration-200 hover:text-slate-900`}>
          {summary}
        </p>
      </div>
    </div>
  );
});

ContentSummary.displayName = 'ContentSummary';
