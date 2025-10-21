import React from 'react';
import SkeletonBase from './SkeletonBase';

/**
 * Example component demonstrating SkeletonBase usage
 * This can be removed once skeleton components are implemented
 */
const SkeletonExample: React.FC = () => {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold mb-4">Skeleton Base Examples</h2>

      {/* Text line skeletons */}
      <div className="space-y-2">
        <SkeletonBase height="1rem" width="100%" />
        <SkeletonBase height="1rem" width="80%" />
        <SkeletonBase height="1rem" width="60%" />
      </div>

      {/* Button skeleton */}
      <SkeletonBase height="2.5rem" width="120px" rounded="md" />

      {/* Avatar skeleton */}
      <SkeletonBase height="3rem" width="3rem" rounded="full" />

      {/* Card skeleton */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <SkeletonBase height="1.5rem" width="70%" />
        <SkeletonBase height="1rem" width="100%" />
        <SkeletonBase height="1rem" width="90%" />
        <SkeletonBase height="1rem" width="75%" />
      </div>

      {/* Non-animated skeleton */}
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Without animation:</p>
        <SkeletonBase height="1rem" width="100%" animate={false} />
      </div>
    </div>
  );
};

export default SkeletonExample;
