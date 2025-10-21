import SkeletonBase from '../common/SkeletonBase';

export const TitleEditorSkeleton = () => {
  return (
    <div className="relative mb-6 sm:mb-8">
      {/* Title input skeleton */}
      <div className="border-2 border-gray-200 bg-gray-50 rounded-lg px-3 py-2">
        <SkeletonBase
          width="60%"
          height={56}
          rounded="md"
          className="bg-gray-200"
        />
      </div>

      {/* Character counter and validation feedback skeleton */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex-1">
          {/* Placeholder for validation messages */}
          <SkeletonBase
            width="140px"
            height={14}
            rounded="sm"
            className="bg-gray-200"
          />
        </div>

        {/* Character counter skeleton */}
        <SkeletonBase
          width="50px"
          height={12}
          rounded="sm"
          className="bg-gray-200"
        />
      </div>
    </div>
  );
};
