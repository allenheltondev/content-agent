import React from 'react';
import { MainEditorLayout } from './MainEditorLayout';
import { EditorHeaderSkeleton } from './EditorHeaderSkeleton';
import { TitleEditorSkeleton } from './TitleEditorSkeleton';
import { ContentEditorSkeleton } from './ContentEditorSkeleton';
import { EditorActionsSkeleton } from './EditorActionsSkeleton';

interface EditorSkeletonProps {
  isNewPost?: boolean;
}

export const EditorSkeleton: React.FC<EditorSkeletonProps> = ({ isNewPost = false }) => {
  return (
    <div className="max-w-7xl mx-auto">
      {/* Editor Header Skeleton */}
      <EditorHeaderSkeleton isNewPost={isNewPost} />

      {/* Main content area with same structure as EditorPage */}
      <div className="px-3 sm:px-4 lg:px-6 xl:px-8 py-3 sm:py-4">
        <MainEditorLayout
          hasSuggestions={false}
          sidebar={<></>}
        >
          {/* Main editor area skeleton */}
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {/* Title Editor Skeleton */}
            <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
              <TitleEditorSkeleton />
            </div>

            {/* Content Editor Skeleton */}
            <ContentEditorSkeleton />
          </div>
        </MainEditorLayout>
      </div>

      {/* Editor Actions Skeleton */}
      <EditorActionsSkeleton isNewPost={isNewPost} />
    </div>
  );
};

EditorSkeleton.displayName = 'EditorSkeleton';
