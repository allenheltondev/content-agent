interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  className?: string;
  fullScreen?: boolean;
}

/**
 * Enhanced loading component with multiple variants
 */
export const LoadingState = ({
  message = 'Loading...',
  size = 'md',
  variant = 'spinner',
  className = '',
  fullScreen = false
}: LoadingStateProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  };

  const renderSpinner = () => (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]}`} />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      <div className={`bg-primary rounded-full animate-bounce ${size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'}`} style={{ animationDelay: '0ms' }} />
      <div className={`bg-primary rounded-full animate-bounce ${size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'}`} style={{ animationDelay: '150ms' }} />
      <div className={`bg-primary rounded-full animate-bounce ${size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4'}`} style={{ animationDelay: '300ms' }} />
    </div>
  );

  const renderPulse = () => (
    <div className={`bg-primary rounded-full animate-pulse ${sizeClasses[size]}`} />
  );

  const renderSkeleton = () => (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded w-1/2"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'skeleton':
        return renderSkeleton();
      case 'spinner':
      default:
        return renderSpinner();
    }
  };

  const containerClasses = fullScreen
    ? 'min-h-screen flex items-center justify-center bg-gray-50'
    : 'flex items-center justify-center p-4';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        {variant !== 'skeleton' && (
          <div className="flex justify-center mb-3">
            {renderLoader()}
          </div>
        )}

        {variant === 'skeleton' ? (
          renderLoader()
        ) : (
          <p className={`text-gray-600 ${textSizeClasses[size]}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Inline loading component for buttons and small areas
 */
export const InlineLoading = ({
  message = 'Loading...',
  size = 'sm'
}: Pick<LoadingStateProps, 'message' | 'size'>) => (
  <div className="flex items-center space-x-2">
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-current ${
      size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
    }`} />
    <span className={size === 'sm' ? 'text-sm' : 'text-base'}>
      {message}
    </span>
  </div>
);

/**
 * Button loading state component
 */
export const ButtonLoading = ({
  message = 'Loading...',
  className = ''
}: { message?: string; className?: string }) => (
  <div className={`flex items-center justify-center space-x-2 ${className}`}>
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-current" />
    <span>{message}</span>
  </div>
);
