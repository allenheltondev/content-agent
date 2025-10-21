import SkeletonBase from '../common/SkeletonBase';

export const ContentEditorSkeleton = () => {
  return (
    <div className="relative">
      {/* Container matching ContentEditorWithSuggestions */}
      <div className="relative">
        {/* Background matching textarea styling */}
        <div className="w-full min-h-[500px] p-6 bg-white border-none">
          {/* Multiple text blocks representing typical blog content */}
          <div className="space-y-4">
            {/* First paragraph - longer */}
            <div className="space-y-2">
              <SkeletonBase
                width="95%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="88%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="92%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="75%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
            </div>

            {/* Gap between paragraphs */}
            <div className="h-4" />

            {/* Second paragraph - medium */}
            <div className="space-y-2">
              <SkeletonBase
                width="90%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="85%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="70%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
            </div>

            {/* Gap between paragraphs */}
            <div className="h-4" />

            {/* Third paragraph - shorter */}
            <div className="space-y-2">
              <SkeletonBase
                width="93%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="65%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
            </div>

            {/* Gap between paragraphs */}
            <div className="h-4" />

            {/* Fourth paragraph - longer */}
            <div className="space-y-2">
              <SkeletonBase
                width="97%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="89%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="91%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="86%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="78%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
            </div>

            {/* Gap between paragraphs */}
            <div className="h-4" />

            {/* Fifth paragraph - medium */}
            <div className="space-y-2">
              <SkeletonBase
                width="94%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="87%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
              <SkeletonBase
                width="82%"
                height={16}
                rounded="sm"
                className="bg-gray-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
