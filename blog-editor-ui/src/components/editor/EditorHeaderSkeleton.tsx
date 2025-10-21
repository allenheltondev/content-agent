import SkeletonBase from '../common/SkeletonBase';

interface EditorHeaderSkeletonProps {
  isNewPost?: boolean;
}

export const EditorHeaderSkeleton = ({ isNewPost = false }: EditorHeaderSkeletonProps) => {
  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
          {/* Back button skeleton */}
          <div className="flex-shrink-0">
            <SkeletonBase
              width={20}
              height={20}
              rounded="sm"
              className="bg-gray-200"
            />
          </div>

          {/* Editor title skeleton */}
          <div className="flex-1 min-w-0">
            <SkeletonBase
              width={isNewPost ? "80px" : "90px"}
              height={28}
              rounded="md"
              className="bg-gray-200"
            />
          </div>
        </div>

        {/* Save status and actions skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="text-left sm:text-right order-2 sm:order-1">
            {/* Save status skeleton */}
            <div className="flex items-center justify-end mb-1">
              <SkeletonBase
                width={16}
                height={16}
                rounded="sm"
                className="bg-gray-200 mr-1"
              />
              <SkeletonBase
                width={isNewPost ? "90px" : "80px"}
                height={14}
                rounded="sm"
                className="bg-gray-200"
              />
            </div>
            {/* Last saved text skeleton */}
            <SkeletonBase
              width={isNewPost ? "120px" : "100px"}
              height={12}
              rounded="sm"
              className="bg-gray-200"
            />
          </div>

          {/* Save button skeleton */}
          <div className="order-1 sm:order-2 w-full sm:w-auto">
            <SkeletonBase
              width="120px"
              height={36}
              rounded="md"
              className="bg-gray-200"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
