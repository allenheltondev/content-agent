import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';
import { EditorFallbackUI } from './EditorFallbackUI';
import { ErrorReportingManager } from '../../utils/errorReporting';


interface TitleEditorProps {
  title: string;
  onChange: (title: string) => void;
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const TitleEditor = memo(({
  title,
  onChange,
  placeholder = "Enter your title here",
  maxLength = 200,
  disabled = false,
  autoFocus = false
}: TitleEditorProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle title changes - memoized to prevent re-renders
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;

    // Allow typing but don't exceed max length
    if (newTitle.length <= maxLength) {
      onChange(newTitle);
    }
  }, [onChange, maxLength]);

  // Handle focus events - memoized to prevent re-renders
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Handle mouse enter for hover effects
  const handleMouseEnter = useCallback(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.style.cursor = 'text';
    }
  }, [disabled]);

  // Handle keyboard shortcuts - memoized to prevent re-renders
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Cmd/Ctrl + S for save (handled by parent component)
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
    }

    // Enter key moves focus to content editor (handled by parent)
    if (e.key === 'Enter') {
      e.preventDefault();
      // Parent component should handle moving focus to content editor
    }
  }, []);

  // Calculate character count and warning state - memoized to prevent re-calculations
  const characterCount = useMemo(() => title.length, [title.length]);
  const isNearLimit = useMemo(() => characterCount >= maxLength * 0.8, [characterCount, maxLength]);
  const isAtLimit = useMemo(() => characterCount >= maxLength, [characterCount, maxLength]);

  // Determine validation state classes - memoized to prevent re-calculations
  const inputClasses = useMemo(() => {
    // Base classes with enhanced styling for visibility and editability
    const baseClasses = "w-full font-bold text-gray-900 placeholder-gray-500 outline-none resize-none overflow-hidden transition-all duration-200 ease-in-out";

    // Font size: Ensure at least 24px (text-2xl is 24px, but we'll use explicit sizing for clarity)
    const fontClasses = "text-2xl sm:text-3xl lg:text-4xl"; // 24px, 30px, 36px respectively

    // Enhanced border and background styling for editability
    const editabilityClasses = isFocused
      ? "border-2 border-blue-500 bg-blue-50 rounded-lg px-3 py-2 shadow-sm"
      : "border-2 border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-300 rounded-lg px-3 py-2 cursor-text";

    if (disabled) {
      return `${baseClasses} ${fontClasses} text-gray-500 cursor-not-allowed border-2 border-gray-200 bg-gray-100 rounded-lg px-3 py-2`;
    }

    if (isAtLimit) {
      return `${baseClasses} ${fontClasses} ${editabilityClasses} text-red-600`;
    }

    if (isNearLimit) {
      return `${baseClasses} ${fontClasses} ${editabilityClasses} text-orange-600`;
    }

    return `${baseClasses} ${fontClasses} ${editabilityClasses}`;
  }, [disabled, isAtLimit, isNearLimit, isFocused]);

  const counterClasses = useMemo(() => {
    const baseClasses = "text-xs font-medium transition-colors duration-200";

    if (isAtLimit) {
      return `${baseClasses} text-red-600`;
    }

    if (isNearLimit) {
      return `${baseClasses} text-orange-600`;
    }

    return `${baseClasses} text-gray-400`;
  }, [isAtLimit, isNearLimit]);

  return (
    <AsyncErrorBoundary
      onError={(error, errorInfo) => {
        ErrorReportingManager.reportEditorError(
          error,
          null,
          'TitleEditor',
          Boolean(title.trim()),
          { errorInfo, title }
        );
      }}
      fallback={(error, retry) => (
        <EditorFallbackUI
          error={error}
          onRetry={retry}
          componentName="Title Editor"
          title={title}
          content=""
        />
      )}
    >
      <div className="relative mb-6 sm:mb-8">
      {/* Title Input */}
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClasses}
        style={{
          lineHeight: '1.3',
          minHeight: '3.5rem'
        }}
        aria-label="Post title"
        role="textbox"
      />

      {/* Character Counter and Validation Feedback */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex-1">
          {/* Validation Messages */}
          {isAtLimit && (
            <div className="text-sm text-red-600 font-medium">
              Character limit reached
            </div>
          )}
          {isNearLimit && !isAtLimit && (
            <div className="text-sm text-orange-600 font-medium">
              Approaching character limit
            </div>
          )}
          {!title && isFocused && (
            <div className="text-sm text-gray-500">
              Give your post a compelling title
            </div>
          )}
        </div>

        {/* Character Counter */}
        <div className={counterClasses}>
          {characterCount}/{maxLength}
        </div>
      </div>

      </div>
    </AsyncErrorBoundary>
  );
});

TitleEditor.displayName = 'TitleEditor';
