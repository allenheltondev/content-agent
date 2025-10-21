import { useEditorMode } from '../../contexts/EditorModeContext';
import { getChangeSummary, getTotalChangedCharacters } from '../../utils/contentDiff';

interface ContentChangeSummaryProps {
  className?: string;
  showDetails?: boolean;
}

/**
 * Component that displays a summary of content changes since last review
 */
export function ContentChangeSummary({ className = '', showDetails = false }: ContentChangeSummaryProps) {
  const { getContentChangesSinceLastReview, hasContentChanges } = useEditorMode();

  const changes = getContentChangesSinceLastReview();
  const hasChanges = hasContentChanges();

  if (!hasChanges) {
    return null;
  }

  const summary = getChangeSummary(changes);
  const totalChanged = getTotalChangedCharacters(changes);

  return (
    <div className={`text-sm text-gray-600 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
        <span>Content modified: {summary}</span>
        {showDetails && (
          <span className="text-gray-500">
            ({totalChanged} character{totalChanged !== 1 ? 's' : ''} changed)
          </span>
        )}
      </div>

      {showDetails && changes.length > 0 && (
        <div className="mt-2 space-y-1">
          {changes.slice(0, 3).map((change, index) => (
            <div key={index} className="text-xs text-gray-500 pl-4">
              <span className="capitalize">{change.type}</span> at position {change.startOffset}
              {change.oldText && (
                <span className="ml-1">
                  ("{change.oldText.slice(0, 20)}{change.oldText.length > 20 ? '...' : ''}")
                </span>
              )}
            </div>
          ))}
          {changes.length > 3 && (
            <div className="text-xs text-gray-400 pl-4">
              ...and {changes.length - 3} more change{changes.length - 3 !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple indicator that shows if content has been modified
 */
export function ContentChangeIndicator({ className = '' }: { className?: string }) {
  const { hasContentChanges } = useEditorMode();

  if (!hasContentChanges()) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-1 text-xs text-orange-600 ${className}`}>
      <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
      <span>Modified</span>
    </div>
  );
}
