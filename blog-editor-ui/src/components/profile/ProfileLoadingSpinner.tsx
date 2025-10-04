import { type ReactNode } from 'react';

interface ProfileLoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'page' | 'inline' | 'overlay';
  children?: ReactNode;
}

export const ProfileLoadingSpinner = ({
  message = 'Loading profile...',
  size = 'md',
  variant = 'page'
}: ProfileLoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const spinner = (
    <div className="text-center" role="status" aria-live="polite">
      <div
        className={`animate-spin rounded-full border-b-2 border-primary mx-auto ${sizeClasses[size]}`}
        aria-hidden="true"
      />
      <p className="mt-4 text-sm text-gray-600" aria-label={message}>
        {message}
      </p>
      <span className="sr-only">{message}</span>
    </div>
  );

  switch (variant) {
    case 'page':
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          {spinner}
        </div>
      );

    case 'inline':
      return (
        <div className="flex items-center justify-center py-8">
          {spinner}
        </div>
      );

    case 'overlay':
      return (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          {spinner}
        </div>
      );

    default:
      return spinner;
  }
};

interface ProfileOperationLoadingProps {
  operation: 'saving' | 'loading' | 'updating' | 'creating';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'page' | 'inline' | 'overlay';
}

export const ProfileOperationLoading = ({
  operation,
  size = 'md',
  variant = 'page'
}: ProfileOperationLoadingProps) => {
  const messages = {
    saving: 'Saving your profile...',
    loading: 'Loading your profile...',
    updating: 'Updating your profile...',
    creating: 'Setting up your profile...'
  };

  return (
    <ProfileLoadingSpinner
      message={messages[operation]}
      size={size}
      variant={variant}
    />
  );
};
