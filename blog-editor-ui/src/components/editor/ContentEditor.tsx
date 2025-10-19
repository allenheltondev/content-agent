import { useRef, useEffect, useCallback, memo } from 'react';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';
import { EditorFallbackUI } from './EditorFallbackUI';
import { ErrorReportingManager } from '../../utils/errorReporting';


interface ContentEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ContentEditor = memo(({
  content,
  onChange,
  placeholder = "Start writing your blog post...",
  disabled = false
}: ContentEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Set height to scrollHeight to fit content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [content]);

  // Handle content changes - memoized to prevent re-renders
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  // Handle keyboard shortcuts - memoized to prevent re-renders
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  }, [content, onChange]);

  return (
    <AsyncErrorBoundary
      onError={(error, errorInfo) => {
        ErrorReportingManager.reportEditorError(
          error,
          null,
          'ContentEditor',
          Boolean(content.trim()),
          { errorInfo, contentLength: content.length }
        );
      }}
      fallback={(error, retry) => (
        <EditorFallbackUI
          error={error}
          onRetry={retry}
          componentName="Content Editor"
          title=""
          content={content}
        />
      )}
    >
      <div className="relative">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full min-h-[400px] sm:min-h-[500px] lg:min-h-[600px] p-4 sm:p-6 text-gray-900 placeholder-gray-400 border-none outline-none focus:ring-0 resize-none font-mono text-sm sm:text-base leading-relaxed bg-white disabled:bg-gray-50 disabled:text-gray-500"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
        }}
      />

      {/* Character count */}
      <div className="absolute bottom-3 sm:bottom-4 right-4 sm:right-6 text-xs text-gray-400 bg-white bg-opacity-80 px-2 py-1 rounded">
        {content.length.toLocaleString()} chars
      </div>

      {/* Writing tips overlay when empty */}
      {content.length === 0 && !disabled && (
        <div className="absolute top-16 sm:top-20 left-4 sm:left-6 right-4 sm:right-6 text-sm text-gray-400 pointer-events-none">
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
            <h3 className="font-medium text-gray-600 mb-2 text-sm sm:text-base">Writing Tips:</h3>
            <ul className="space-y-1 text-xs sm:text-sm">
              <li>• Use Cmd/Ctrl + S to save your work</li>
              <li>• Your content is automatically saved as you type</li>
              <li className="hidden sm:list-item">• Writing improvements will appear when you edit existing posts</li>
              <li className="hidden sm:list-item">• Use Tab to indent text</li>
            </ul>
          </div>
        </div>
      )}
      </div>
    </AsyncErrorBoundary>
  );
});

ContentEditor.displayName = 'ContentEditor';
