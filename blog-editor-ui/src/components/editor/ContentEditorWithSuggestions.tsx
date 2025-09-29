import { useRef, useEffect, useState, useCallback } from 'react';
import { SuggestionOverlay } from './SuggestionOverlay';
import type { Suggestion } from '../../types';

interface ContentEditorWithSuggestionsProps {
  content: string;
  suggestions: Suggestion[];
  onChange: (content: string) => void;
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showSuggestions?: boolean;
}

/**
 * Enhanced ContentEditor with suggestion highlighting overlay
 */
export const ContentEditorWithSuggestions = ({
  content,
  suggestions,
  onChange,
  onAcceptSuggestion,
  onRejectSuggestion,
  placeholder = "Start writing your blog post...",
  disabled = false,
  showSuggestions = true
}: ContentEditorWithSuggestionsProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [, setScrollTop] = useState(0);
  const [, setScrollLeft] = useState(0);

  // Sync overlay scroll with textarea scroll
  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      const textarea = textareaRef.current;
      setScrollTop(textarea.scrollTop);
      setScrollLeft(textarea.scrollLeft);

      // Update overlay position
      overlayRef.current.scrollTop = textarea.scrollTop;
      overlayRef.current.scrollLeft = textarea.scrollLeft;
    }
  }, []);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight to fit content
      const newHeight = Math.max(500, textarea.scrollHeight);
      textarea.style.height = `${newHeight}px`;

      // Update overlay height to match
      if (overlayRef.current) {
        overlayRef.current.style.height = `${newHeight}px`;
      }
    }
  }, [content]);

  // Handle content changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + S for save (handled by parent component)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      // The save functionality will be handled by the parent EditorPage
    }

    // Tab key handling for better UX
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      // Insert tab character
      const newContent = content.substring(0, start) + '\t' + content.substring(end);
      onChange(newContent);

      // Set cursor position after the tab
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }, 0);
    }
  };

  // Handle suggestion acceptance
  const handleAcceptSuggestion = useCallback((suggestionId: string) => {
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (!suggestion) return;

    // Apply the suggestion to the content
    const { startOffset, endOffset, replaceWith } = suggestion;
    const newContent =
      content.substring(0, startOffset) +
      replaceWith +
      content.substring(endOffset);

    onChange(newContent);
    onAcceptSuggestion(suggestionId);
  }, [content, suggestions, onChange, onAcceptSuggestion]);

  // Handle suggestion rejection
  const handleRejectSuggestion = useCallback((suggestionId: string) => {
    onRejectSuggestion(suggestionId);
  }, [onRejectSuggestion]);

  return (
    <div ref={containerRef} className="relative">
      {/* Container for textarea and overlay */}
      <div className="relative">
        {/* Suggestion overlay */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none overflow-hidden"
            style={{
              zIndex: 1,
              paddingTop: '24px', // Match textarea padding
              paddingLeft: '24px',
              paddingRight: '24px',
              paddingBottom: '24px',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word'
            }}
          >
            <SuggestionOverlay
              suggestions={suggestions}
              content={content}
              onAccept={handleAcceptSuggestion}
              onReject={handleRejectSuggestion}
              className="pointer-events-auto"
            />
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full min-h-[500px] p-6 text-gray-900 placeholder-gray-400
            border-none outline-none focus:ring-0 resize-none font-mono text-sm leading-relaxed
            bg-transparent disabled:bg-gray-50 disabled:text-gray-500 relative
            ${showSuggestions && suggestions.length > 0 ? 'text-transparent caret-gray-900' : 'bg-white'}
          `}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            zIndex: showSuggestions && suggestions.length > 0 ? 2 : 1
          }}
        />

        {/* Background for textarea when suggestions are shown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            className="absolute inset-0 bg-white border-none"
            style={{ zIndex: 0 }}
          />
        )}
      </div>

      {/* Character count */}
      <div className="absolute bottom-4 right-6 text-xs text-gray-400 z-10">
        {content.length.toLocaleString()} characters
      </div>

      {/* Suggestion count indicator */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-4 right-6 z-10">
          <div className="flex items-center space-x-2 bg-white rounded-full px-3 py-1 shadow-sm border border-gray-200">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-600 font-medium">
              {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Writing tips overlay when empty */}
      {content.length === 0 && !disabled && (
        <div className="absolute top-20 left-6 right-6 text-sm text-gray-400 pointer-events-none z-10">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-medium text-gray-600 mb-2">Writing Tips:</h3>
            <ul className="space-y-1 text-xs">
              <li>• Use Cmd/Ctrl + S to save your work</li>
              <li>• Your content is automatically saved as you type</li>
              <li>• AI suggestions will appear when you edit existing posts</li>
              <li>• Use Tab to indent text</li>
              <li>• Hover over highlighted text to see suggestions</li>
            </ul>
          </div>
        </div>
      )}

      {/* Suggestion legend */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bottom-4 left-6 z-10">
          <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 text-xs">
            <div className="font-medium text-gray-700 mb-2">Suggestion Types:</div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-200 border border-blue-400 rounded-sm" />
                <span className="text-gray-600">AI</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-purple-200 border border-purple-400 rounded-sm" />
                <span className="text-gray-600">Brand</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-200 border border-orange-400 rounded-sm" />
                <span className="text-gray-600">Fact</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-200 border border-green-400 rounded-sm" />
                <span className="text-gray-600">Grammar</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-200 border border-red-400 rounded-sm" />
                <span className="text-gray-600">Spelling</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
