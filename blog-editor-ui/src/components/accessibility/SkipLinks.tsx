import { useFocusManagement } from '../../hooks/useFocusManagement';
import { useEditorMode } from '../../contexts/EditorModeContext';

interface SkipLinksProps {
  className?: string;
}

/**
 * SkipLinks component provides keyboard navigation shortcuts for accessibility
 */
export const SkipLinks = ({ className = '' }: SkipLinksProps) => {
  const { skipToContent, skipToSuggestions } = useFocusManagement();
  const { currentMode } = useEditorMode();

  const handleSkipToContent = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    skipToContent();
  };

  const handleSkipToSuggestions = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    skipToSuggestions();
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className={`skip-links ${className}`}>
      {/* Skip links container - only visible when focused */}
      <div className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-4 focus-within:left-4 focus-within:z-50">
        <div className="flex flex-col space-y-2 bg-white border-2 border-gray-900 rounded-lg p-4 shadow-lg">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Skip to:</h2>

          {/* Skip to main content */}
          <button
            type="button"
            onClick={handleSkipToContent}
            onKeyDown={(e) => handleKeyDown(e, skipToContent)}
            className="text-left text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
          >
            Main content editor
          </button>

          {/* Skip to suggestions - only show in review mode */}
          {currentMode === 'review' && (
            <button
              type="button"
              onClick={handleSkipToSuggestions}
              onKeyDown={(e) => handleKeyDown(e, skipToSuggestions)}
              className="text-left text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
            >
              Suggestions panel
            </button>
          )}

          {/* Mode toggle shortcut reminder */}
          <div className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
            <p>Keyboard shortcuts:</p>
            <ul className="mt-1 space-y-1">
              <li>• Ctrl+M (Cmd+M): Toggle edit/review mode</li>
              <li>• Ctrl+S (Cmd+S): Save content</li>
              {currentMode === 'review' && (
                <>
                  <li>• ← →: Navigate suggestions</li>
                  <li>• Enter: Accept suggestion</li>
                  <li>• Escape: Reject suggestion</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
