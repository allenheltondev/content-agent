import SkeletonBase from '../common/SkeletonBase';

interface EditorActionsSkeletonProps {
  isNewPost?: boolean;
}

export const EditorActionsSkeleton = ({ isNewPost = false }: EditorActionsSkeletonProps) => {
  return (
    <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-0 lg:justify-between">
        {/* Left side - Save action and status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          {/* Save button skeleton */}
          <SkeletonBase
            width="120px"
            height={40}
            rounded="md"
            className="bg-gray-200"
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {/* Post status indicator skeleton */}
            <div className="inline-flex items-center">
              <SkeletonBase
                width="60px"
                height={24}
                rounded="full"
                className="bg-gray-200"
              />
            </div>

            {/* Status message skeleton */}
            <SkeletonBase
              width="140px"
              height={14}
              rounded="sm"
              className="bg-gray-200"
            />
          </div>
        </div>

        {/* Right side - Workflow actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Submit for Review button skeleton */}
          <SkeletonBase
            width={isNewPost ? "140px" : "160px"}
            height={40}
            rounded="md"
            className="bg-gray-200"
          />

          {/* Finalize Draft button skeleton */}
          <SkeletonBase
            width="130px"
            height={40}
            rounded="md"
            className="bg-gray-200"
          />
        </div>
      </div>

      {/* Help text skeleton */}
      <div className="mt-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <SkeletonBase
            width="280px"
            height={12}
            rounded="sm"
            className="bg-gray-200"
          />
          <div className="hidden lg:flex items-center space-x-4">
            <SkeletonBase
              width="200px"
              height={12}
              rounded="sm"
              className="bg-gray-200"
            />
            <SkeletonBase
              width="180px"
              height={12}
              rounded="sm"
              className="bg-gray-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
