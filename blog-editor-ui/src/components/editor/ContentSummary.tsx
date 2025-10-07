
import { memo } from 'react';

export interface ContentSummaryProps {
  summary?: string;
  isLoading?: boolean;
  className?: string;
}

interface SummaryLoadingSkeletonProps {
  className?: string;
}

/**
 * Loading skeleton component for summary loading state
 */
const SummaryLoadingSkeleton = memo(({ className = '' }: SummaryLoadingSkeletonProps) => {
  return (
    <div className={`animate-pulse ${className}`} role="status" aria-label="Loading content summary">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5">
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-4 h-4 bg-slate-300 rounded"></div>
          <div className="h-4 bg-slate-300 rounded w-32"></div>
        </div>
        <div className="space-y-2.5">
          <div className="h-4 bg-slate-300 rounded w-full"></div>
          <div className="h-4 bg-slate-300 rounded w-5/6"></div>
          <div className="h-4 bg-slate-300 rounded w-4/5"></div>
        </div>
      </div>
    </div>
  );
});

SummaryLoadingSkeleton.displayName = 'SummaryLoadingSkeleton';

/**
 * ContentSummary component displays a 3-sentence summary of the current content version
 * Provides users with a quick overview of their content's key points and themes
 */
export const ContentSummary = memo(({ summary, isLoading = false, className = '' }: ContentSummaryProps) => {
  // Show loading skeleton while summary is loading
  if (isLoading) {
    return <SummaryLoadingSkeleton className={className} />;
  }

  // Gracefully handle missing summary - render nothing
  if (!summary || summary.trim() === '') {
    return null;
  }

  return (
    <div className={`content-summary ${className}`} role="region" aria-labelledby="content-summary-title">
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center space-x-2 mb-3">
          <svg
            className="w-4 h-4 text-slate-600 flex-shrink-0"
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
          <h3 id="content-summary-title" className="text-sm font-semibold text-slate-700">
            Content Summary
          </h3>
        </div>
        <p className="text-sm sm:text-base text-slate-700 leading-relaxed sm:leading-7 font-normal">
          {summary}
        </p>
      </div>
    </div>
  );
});

ContentSummary.displayName = 'ContentSummary';
