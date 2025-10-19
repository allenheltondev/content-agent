import React from 'react';
import type { LogoProps } from '../../types';

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12'
};

const textSizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl'
};

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = ''
}) => {
  const logoClasses = `${sizeClasses[size]} ${className}`;
  const textClasses = `${textSizeClasses[size]} font-bold text-tertiary ml-2`;

  return (
    <div className="flex items-center" role="img" aria-label="Betterer - AI-powered writing assistant">
      <img
        src="/logo.png"
        alt=""
        className={logoClasses}
        aria-hidden="true"
      />
      {showText && (
        <span className={textClasses} aria-hidden="true">
          Betterer
        </span>
      )}
    </div>
  );
};
