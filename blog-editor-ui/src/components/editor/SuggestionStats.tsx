import type { SuggestionType } from '../../types';

interface SuggestionStatsProps {
  stats: {
    total: number;
    accepted: number;
    rejected: number;
    canUndo: boolean;
    byType: Record<SuggestionType, number>;
  };
  onUndoClick?: () => void;
  className?: string;
}

/**
 * SuggestionStats component displays statistics about suggestions
 * and provides quick access to undo functionality
 */
export const SuggestionStats = ({
  stats,
  onUndoClick,
  className = ''
}: SuggestionStatsProps) => {
  const getSuggestionTypeColor = (type: SuggestionType) => {
    const colorMap = {
      llm: 'text-blue-600 bg-blue-50',
      brand: 'text-purple-600 bg-purple-50',
      fact: 'text-orange-600 bg-orange-50',
      grammar: 'text-green-600 bg-green-50',
      spelling: 'text-red-600 bg-red-50'
    };
    return colorMap[type];
  };

  const getSuggestionTypeName = (type: SuggestionType) => {
    const nameMap = {
      llm: 'AI',
      brand: 'Brand',
      fact: 'Fact',
      grammar: 'Grammar',
      spelling: 'Spelling'
    };
    return nameMap[type];
  };

  const hasActiveSuggestions = stats.total > 0;
  const hasActivity = stats.accepted > 0 || stats.rejected > 0;

  if (!hasActiveSuggestions && !hasActivity) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-3 sm:p-4 ${className}`}>
      {/* Header with prominent active count */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
        <div className="flex items-center space-x-3">
          <h3 className="text-sm font-medium text-gray-900">
            Suggestions
          </h3>
          {hasActiveSuggestions && (
            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
              {stats.total} active
            </div>
          )}
        </div>

        {stats.canUndo && onUndoClick && (
          <button
            onClick={onUndoClick}
            className="w-full sm:w-auto inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors touch-manipulation"
          >
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Undo Last
          </button>
        )}
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        <div className="text-center">
          <div className="text-base sm:text-lg font-semibold text-gray-900">
            {stats.total}
          </div>
          <div className="text-xs text-gray-500">
            Active
          </div>
        </div>

        <div className="text-center">
          <div className="text-base sm:text-lg font-semibold text-green-600">
            {stats.accepted}
          </div>
          <div className="text-xs text-gray-500">
            Accepted
          </div>
        </div>

        <div className="text-center">
          <div className="text-base sm:text-lg font-semibold text-gray-600">
            {stats.rejected}
          </div>
          <div className="text-xs text-gray-500">
            Rejected
          </div>
        </div>
      </div>

      {/* Type breakdown */}
      {hasActiveSuggestions && (
        <div>
          <div className="text-xs font-medium text-gray-700 mb-2">
            By Type
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            {(Object.entries(stats.byType) as [SuggestionType, number][])
              .filter(([, count]) => count > 0)
              .map(([type, count]) => (
                <div
                  key={type}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSuggestionTypeColor(type)}`}
                >
                  <span className="mr-1">{getSuggestionTypeName(type)}</span>
                  <span className="bg-white bg-opacity-80 rounded-full px-1.5 py-0.5 text-xs font-semibold">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Progress indicator */}
      {hasActivity && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>
              {stats.accepted + stats.rejected} of {stats.total + stats.accepted + stats.rejected} processed
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{
                width: `${((stats.accepted + stats.rejected) / (stats.total + stats.accepted + stats.rejected)) * 100}%`
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
