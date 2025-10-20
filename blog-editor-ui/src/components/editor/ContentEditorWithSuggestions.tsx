import { useRef, useEffect, useState, useCallback } from 'react';
import { SuggestionHighlightOverlay } from './SuggestionHighlightOverlay';
import { IntegratedActiveSuggestionSystem } from './IntegratedActiveSuggestionSystem';
import type { Suggestion } from '../../types';

interface ContentEditorWithSuggestionsProps {
  content: string;
  suggestions: Suggestion[];
  onChange: (content: string) => void;
  onAcceptSuggestion: (id: string) => void;
  onRejectSuggestion: (id: string) => void;
  onSuggestionExpand?: (suggestionId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  showSuggestions?: boolean;
  useActiveSuggestionSystem?: boolean; // New prop to enable the active suggestion system
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
  onSuggestionExpand,
  placeholder = "Start writing your blog post...",
  disabled = false,
  showSuggestions = true,
  useActiveSuggestionSystem = false // Default to using highlight-only system
}: ContentEditorWithSuggestionsProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [, setScrollTop] = useState(0);
  const [, setScrollLeft] = useState(0);

  // Track focus/typing
  const [isFocused, setIsFocused] = useState(false);
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
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 400);
  };

  // Reindex suggestions after content changes (debounced typing window)
  useEffect(() => {
    if (isTyping) return;
    const prev = lastContentRef.current;
    const next = content;
    if (prev === next) return;

    // Compute first/last diff window
    let i = 0;
    const minLen = Math.min(prev.length, next.length);
    while (i < minLen && prev[i] === next[i]) i++;

    let jPrev = prev.length - 1;
    let jNext = next.length - 1;
    while (jPrev >= i && jNext >= i && prev[jPrev] === next[jNext]) { jPrev--; jNext--; }

    const changeStart = i;
    const delta = next.length - prev.length;

    const updated = adjustedSuggestions.map(s => {
      let start = s.startOffset;
      let end = s.endOffset;

      if (start >= changeStart) {
        start = start + delta;
        end = end + delta;
      } else if (end > changeStart) {
        end = end + delta;
      }

      start = Math.max(0, Math.min(start, next.length));
      end = Math.max(start, Math.min(end, next.length));
      return { ...s, startOffset: start, endOffset: end };
    });

    setAdjustedSuggestions(updated);
    lastContentRef.current = next;
  }, [content, adjustedSuggestions, isTyping]);

  // Focus handlers
  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => { setIsFocused(false); setIsTyping(false); }, []);

  const overlayPointerClass = useMemo(() => (isFocused ? 'pointer-events-none' : 'pointer-events-auto'), [isFocused]);

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



  return (
    <div ref={containerRef} className="relative">
      {/* Container for textarea and overlay */}
      <div className="relative">
        {/* Integrated Active Suggestion System or Legacy Overlay */}
        {showSuggestions && adjustedSuggestions.length > 0 && !isTyping && (
          <>
            {useActiveSuggestionSystem ? (
              // New integrated active suggestion system
              <div
                ref={overlayRef}
                className={`absolute inset-0 pointer-events-none overflow-visible`}
                style={{
                  zIndex: 10,
                  paddingTop: '24px', // Match textarea padding
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  paddingBottom: '24px',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  fontSize: '14px',
                  // Match Tailwind's leading-relaxed exactly to keep wrapping in sync
                  lineHeight: '1.625',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
              >
                <IntegratedActiveSuggestionSystem
                  suggestions={[...adjustedSuggestions].sort((a,b)=>a.startOffset-b.startOffset)}
                  content={content}
                  onAcceptSuggestion={onAcceptSuggestion}
                  onRejectSuggestion={onRejectSuggestion}
                  onEditSuggestion={(suggestionId, _newText) => {
                    // Handle suggestion editing - for now, just accept with the new text
                    onAcceptSuggestion(suggestionId);
                  }}
                  className="pointer-events-none"
                  config={{
                    enableAutoAdvance: true,
                    enableScrollToActive: true,
                    enableTransitions: true,
                    enablePerformanceMonitoring: true,
                    enableResponsivePositioning: true
                  }}
                  visible={!isTyping}
                  showActiveArea={!isFocused}
                />
              </div>
            ) : (
              // Legacy suggestion overlay system
              <div
                ref={overlayRef}
                className={`absolute inset-0 pointer-events-none overflow-visible`}
                style={{
                  zIndex: 10,
                  paddingTop: '24px', // Match textarea padding
                  paddingLeft: '24px',
                  paddingRight: '24px',
                  paddingBottom: '24px',
                  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                  fontSize: '14px',
                  lineHeight: '1.625',
                  whiteSpace: 'pre-wrap',
                  wordWrap: 'break-word'
                }}
              >
                <SuggestionHighlightOverlay
                  suggestions={[...adjustedSuggestions].sort((a,b)=>a.startOffset-b.startOffset)}
                  content={content}
                  onSuggestionClick={(suggestionId) => {
                    // Handle click to accept suggestion
                    handleAcceptSuggestion(suggestionId);
                  }}
                  onSuggestionExpand={onSuggestionExpand}
                  className="pointer-events-none"
                />
              </div>
            )}
          </>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full min-h-[500px] p-6 text-gray-900 placeholder-gray-400
            border-none outline-none focus:ring-0 resize-none font-mono text-sm leading-relaxed
            bg-transparent disabled:bg-gray-50 disabled:text-gray-500 relative
            ${showSuggestions && adjustedSuggestions.length > 0 && !isTyping ? 'text-transparent caret-gray-900' : 'bg-white'}
          `}
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            zIndex: showSuggestions && adjustedSuggestions.length > 0 && !isTyping ? 2 : 1
          }}
        />

        {/* Background for textarea when suggestions are shown */}
        {showSuggestions && adjustedSuggestions.length > 0 && !isTyping && (
          <div
            className="absolute inset-0 bg-white border-none"
            style={{ zIndex: 0 }}
          />
        )}
      </div>

      {/* Character count removed */}

      {/* Suggestion count indicator removed */}

      {/* Writing tips overlay removed */}

      {/* Suggestion legend removed */}
    </div>
  );
};

