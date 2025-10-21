import { useRef, useEffect, useState, useCallback } from 'react';
import { IntegratedActiveSuggestionSystem } from './IntegratedActiveSuggestionSystem';
import { useEditorMode } from '../../contexts/EditorModeContext';
import type { Suggestion } from '../../types';
import type { EditorMode } from '../../types';

interface ContentEditorWithSuggestionsProps {
  content: string;
  suggestions: Suggestion[];
  onChange: (content: string) => void;
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showSuggestions?: boolean;
  // Mode-aware props (optional - will use context if not provided)
  editorMode?: EditorMode;
  isTransitioning?: boolean;
  onModeChange?: (mode: EditorMode) => void;
  // Enhanced suggestion props
  suggestionVersion?: number;
  onSuggestionRecalculation?: () => Promise<void>;
}

/**
 * Enhanced ContentEditor with suggestion highlighting overlay and mode awareness
 */
export const ContentEditorWithSuggestions = ({
  content,
  suggestions,
  onChange,
  onAcceptSuggestion,
  onRejectSuggestion,
  placeholder = "Start writing your blog post...",
  disabled = false,
  showSuggestions = true,
  // Mode-aware props with context fallback
  editorMode: propEditorMode,
  isTransitioning: propIsTransitioning,
  onModeChange,
  onSuggestionRecalculation,
}: ContentEditorWithSuggestionsProps) => {
  // Use EditorModeProvider context, with props as fallback
  const editorModeContext = useEditorMode();

  // Determine actual mode and transition state
  const editorMode = propEditorMode ?? editorModeContext.currentMode;
  const isTransitioning = propIsTransitioning ?? editorModeContext.isTransitioning;

  // Notify parent of mode changes if callback provided
  useEffect(() => {
    if (onModeChange && editorMode) {
      onModeChange(editorMode);
    }
  }, [editorMode, onModeChange]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // containerRef removed (unused)

  // Track typing
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Locally adjusted suggestions for debounce reindexing
  const [adjustedSuggestions, setAdjustedSuggestions] = useState<Suggestion[]>(suggestions);
  const lastContentRef = useRef<string>(content);

  // Reset adjusted suggestions when upstream suggestions change
  useEffect(() => {
    setAdjustedSuggestions(suggestions);
  }, [suggestions]);

  // Sync overlay scroll with textarea scroll
  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      const textarea = textareaRef.current;
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

  // Handle content changes - respect editor mode
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // In Review mode, disable content editing
    if (editorMode === 'review') {
      return;
    }

    // During transitions, prevent editing to avoid conflicts
    if (isTransitioning) {
      return;
    }

    onChange(e.target.value);
    setIsTyping(true);

    // Mark content as changed in context if available
    if (editorModeContext && editorMode === 'edit') {
      editorModeContext.markContentChanged();
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 400);
  };

  // Reindex suggestions after content changes (debounced typing window) with improved offset calculation
  useEffect(() => {
    if (isTyping) return;
    const prev = lastContentRef.current;
    const next = content;
    if (prev === next) return;

    // Compute first/last diff window with more precision
    let changeStart = 0;
    const minLen = Math.min(prev.length, next.length);

    // Find the first differing character
    while (changeStart < minLen && prev[changeStart] === next[changeStart]) {
      changeStart++;
    }

    // Find the last differing character
    let prevEnd = prev.length - 1;
    let nextEnd = next.length - 1;
    while (prevEnd >= changeStart && nextEnd >= changeStart && prev[prevEnd] === next[nextEnd]) {
      prevEnd--;
      nextEnd--;
    }

    const changeEnd = prevEnd + 1; // End of changed region in old content
    const delta = next.length - prev.length;

    const updated = adjustedSuggestions.map(s => {
      let start = s.startOffset;
      let end = s.endOffset;

      // If suggestion is completely before the change, no adjustment needed
      if (end <= changeStart) {
        return s;
      }

      // If suggestion is completely after the change, shift by delta
      if (start >= changeEnd) {
        start = Math.max(0, start + delta);
        end = Math.max(start, end + delta);
      }
      // If suggestion overlaps with the change, it may be invalidated
      else if (start < changeEnd && end > changeStart) {
        // For overlapping suggestions, we need to be more careful
        // If the suggestion starts before the change and ends after the change start
        if (start < changeStart && end > changeStart) {
          // Adjust the end offset
          end = Math.max(start, end + delta);
        }
        // If the suggestion starts within the changed region
        else if (start >= changeStart && start < changeEnd) {
          // This suggestion is likely invalidated, but we'll adjust it anyway
          start = Math.max(0, Math.min(start + delta, next.length));
          end = Math.max(start, Math.min(end + delta, next.length));
        }
      }

      // Ensure bounds are valid
      start = Math.max(0, Math.min(start, next.length));
      end = Math.max(start, Math.min(end, next.length));

      // If the suggestion now has no text (start === end), it should be filtered out
      // but we'll let the parent component handle that
      return { ...s, startOffset: start, endOffset: end };
    }).filter(s => s.startOffset < s.endOffset && s.startOffset < next.length);

    setAdjustedSuggestions(updated);
    lastContentRef.current = next;
  }, [content, adjustedSuggestions, isTyping]);

  // Blur handler to stop typing state quickly
  const handleBlur = useCallback(() => { setIsTyping(false); }, []);

  // Always allow pointer events on overlay so first click works on buttons/highlights
  // Interaction visibility is managed via `isTyping` and `showActiveArea` instead

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

  // Determine if suggestions should be visible
  const shouldShowSuggestions = showSuggestions && adjustedSuggestions.length > 0 && !isTyping && editorMode === 'review';

  // Handle suggestion recalculation trigger
  useEffect(() => {
    if (onSuggestionRecalculation && editorModeContext?.pendingRecalculation) {
      onSuggestionRecalculation();
    }
  }, [onSuggestionRecalculation, editorModeContext?.pendingRecalculation]);

  return (
    <div className="relative" data-testid="content-editor">
      {/* Mode transition loading indicator */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium">
              {editorMode === 'review' ? 'Switching to Review mode...' : 'Switching to Edit mode...'}
            </span>
          </div>
        </div>
      )}

      {/* Container for textarea and overlay */}
      <div className="relative">
        {/* Integrated Active Suggestion System - only show in Review mode */}
        {shouldShowSuggestions && (
          <div
            ref={overlayRef}
            className={`
              absolute inset-0 pointer-events-auto overflow-visible
              transition-opacity duration-300 ease-in-out
              p-6 font-mono text-sm leading-relaxed
              ${isTransitioning ? 'opacity-0' : 'opacity-100'}
            `}
            style={{
              zIndex: 10,
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              // Ensure exact font matching with textarea
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              // Use exact pixel values to match textarea
              fontSize: '0.875rem', // 14px
              lineHeight: '1.625', // leading-relaxed
              letterSpacing: '0', // Ensure no letter spacing differences
              wordSpacing: '0' // Ensure no word spacing differences
            }}
          >
            <IntegratedActiveSuggestionSystem
              suggestions={[...adjustedSuggestions].sort((a,b)=>a.startOffset-b.startOffset)}
              content={content}
              onAcceptSuggestion={onAcceptSuggestion}
              onRejectSuggestion={onRejectSuggestion}
              onEditSuggestion={(suggestionId, _newText) => {
                // For now, treat edit as accept
                onAcceptSuggestion(suggestionId);
              }}
              config={{
                enableAutoAdvance: true,
                enableScrollToActive: true,
                enableTransitions: true,
                enablePerformanceMonitoring: true,
                enableResponsivePositioning: true
              }}
              visible={!isTyping && !isTransitioning}
              showActiveArea={true}
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
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled || editorMode === 'review' || isTransitioning}
          className={`
            w-full min-h-[500px] p-6 text-gray-900 placeholder-gray-400
            border-none outline-none focus:ring-0 resize-none font-mono text-sm leading-relaxed
            bg-transparent relative
            transition-all duration-300 ease-in-out
            ${shouldShowSuggestions ? 'text-transparent caret-gray-900' : 'bg-white'}
            ${editorMode === 'review' ? 'cursor-default' : 'cursor-text'}
            ${isTransitioning ? 'opacity-75' : 'opacity-100'}
            ${editorMode === 'edit' ? 'focus:bg-white focus:shadow-sm' : ''}
            ${editorMode === 'review' ? 'bg-gray-50' : 'bg-white'}
          `}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '0.875rem', // Exact match with overlay
            lineHeight: '1.625', // Exact match with overlay
            letterSpacing: '0', // Ensure no letter spacing differences
            wordSpacing: '0', // Ensure no word spacing differences
            zIndex: shouldShowSuggestions ? 2 : 1
          }}
          aria-label={`Content editor - ${editorMode} mode`}
          aria-describedby={editorMode === 'review' ? 'review-mode-help' : 'edit-mode-help'}
        />

        {/* Background for textarea when suggestions are shown */}
        {shouldShowSuggestions && (
          <div
            className={`
              absolute inset-0 bg-white border-none
              transition-opacity duration-300 ease-in-out
              ${isTransitioning ? 'opacity-0' : 'opacity-100'}
            `}
            style={{ zIndex: 0 }}
          />
        )}



        {/* Accessibility helpers */}
        <div id="edit-mode-help" className="sr-only">
          Edit mode: You can freely edit your content. Suggestions are hidden to provide an unobstructed writing experience.
        </div>
        <div id="review-mode-help" className="sr-only">
          Review mode: Content editing is disabled. You can review and interact with suggestions to improve your content.
        </div>
      </div>
    </div>
  );
};

