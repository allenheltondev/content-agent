import React, { useState } from 'react';
import type { InfoBoxProps } from '../../types';

const typeStyles = {
  info: {
    container: 'bg-primary/10 border-primary/30 text-tertiary',
    icon: 'text-primary',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  tip: {
    container: 'bg-secondary/10 border-secondary/30 text-tertiary',
    icon: 'text-secondary',
    iconPath: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
  },
  warning: {
    container: 'bg-orange-50 border-orange-200 text-tertiary',
    icon: 'text-orange-500',
    iconPath: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  }
};

export const InfoBox: React.FC<InfoBoxProps> = ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id: _id, // Used for persistence by parent components
  title,
  content,
  type = 'info',
  onDismiss,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleDismiss = () => {
    setIsAnimating(true);

    // Start exit animation
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300); // Match the animation duration
  };

  if (!isVisible) {
    return null;
  }

  const styles = typeStyles[type];
  const containerClasses = `
    ${styles.container}
    border rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 relative
    transition-all duration-300 ease-in-out
    ${isAnimating ? 'opacity-0 transform scale-95 -translate-y-2' : 'opacity-100 transform scale-100 translate-y-0'}
    ${className}
  `.trim();

  return (
    <div className={containerClasses} role="alert" aria-live="polite">
      <div className="flex items-start">
        {/* Icon */}
        <div className={`flex-shrink-0 ${styles.icon} mr-2 sm:mr-3 mt-0.5`}>
          <svg
            className="h-4 w-4 sm:h-5 sm:w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={styles.iconPath}
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm sm:text-base font-semibold mb-1">
            {title}
          </h3>
          <div className="text-xs sm:text-sm">
            {typeof content === 'string' ? (
              <p>{content}</p>
            ) : (
              content
            )}
          </div>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className={`
              flex-shrink-0 ml-2 sm:ml-3 p-1 rounded-md
              ${styles.icon} hover:bg-black/5
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-primary/50
            `}
            aria-label="Dismiss"
            type="button"
          >
            <svg
              className="h-3 w-3 sm:h-4 sm:w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
