import React from 'react';
import { useShimmer } from '../../hooks/useShimmer';

export interface SkeletonBaseProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  animate?: boolean;
  animationDuration?: number;
  animationDelay?: number;
}

const SkeletonBase: React.FC<SkeletonBaseProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  rounded = 'md',
  animate = true,
  animationDuration = 1.5,
  animationDelay = 0,
}) => {
  const { shimmerClasses, shimmerStyle } = useShimmer({
    enabled: animate,
    duration: animationDuration,
    delay: animationDelay,
  });

  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  const widthStyle = typeof width === 'number' ? `${width}px` : width;
  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`
        ${animate ? shimmerClasses : 'bg-gray-200'}
        ${roundedClasses[rounded]}
        ${className}
      `.trim()}
      style={{
        width: widthStyle,
        height: heightStyle,
        ...shimmerStyle,
      }}
    />
  );
};

export default SkeletonBase;
