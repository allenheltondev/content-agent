import {
  CloudArrowUpIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import type { BlogPost } from '../../types';

interface EditorActionsProps {
  onSave: () => void;
  onSubmitReview: () => void;
  onFinalize: () => void;
  isSaving: boolean;
  isDirty: boolean;
  canSubmit: boolean;
  post: BlogPost | null;
}

export const EditorActions = ({
  onSave,
  onSubmitReview,
  onFinalize,
  isSaving,
  isDirty,
  canSubmit,
  post
}: EditorActionsProps) => {

  // Check if workflow actions should be disabled based on post status
  const isWorkflowDisabled = !post || post.status === 'finalized' || post.status === 'published';
  const isInReview = post?.status === 'review';

  // Get status display information
  const getStatusInfo = () => {
    if (!post) return null;

    switch (post.status) {
      case 'draft':
        return {
          text: 'Draft',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          icon: <InformationCircleIcon className="h-4 w-4" />
        };
      case 'review':
        return {
          text: 'Under Review',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          icon: <PaperAirplaneIcon className="h-4 w-4" />
        };
      case 'finalized':
        return {
          text: 'Finalized',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          icon: <CheckCircleIcon className="h-4 w-4" />
        };
      case 'published':
        return {
          text: 'Published',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          icon: <CheckCircleIcon className="h-4 w-4" />
        };
      case 'abandoned':
        return {
          text: 'Abandoned',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          icon: <ExclamationTriangleIcon className="h-4 w-4" />
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-0 lg:justify-between">
        {/* Left side - Save action and status */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <button
            onClick={onSave}
            disabled={!isDirty || isSaving || isWorkflowDisabled}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {/* Post status indicator */}
            {statusInfo && (
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor}`}>
                {statusInfo.icon}
                <span className="ml-1">{statusInfo.text}</span>
              </div>
            )}

            {/* Unsaved changes warning */}
            {isDirty && !isSaving && !isWorkflowDisabled && (
              <div className="flex items-center text-sm text-orange-600">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">You have unsaved changes</span>
                <span className="sm:hidden">Unsaved changes</span>
              </div>
            )}

            {/* Workflow disabled message */}
            {isWorkflowDisabled && post && (
              <div className="flex items-center text-sm text-gray-500">
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">
                  {post.status === 'finalized' ? 'Post is finalized' :
                   post.status === 'published' ? 'Post is published' : 'Read-only mode'}
                </span>
                <span className="sm:hidden">Read-only</span>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Workflow actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Submit for Review button */}
          <button
            onClick={onSubmitReview}
            disabled={!canSubmit || isSaving || isDirty || isWorkflowDisabled}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              isWorkflowDisabled ? "Cannot submit finalized or published posts" :
              isDirty ? "Save your changes before submitting for review" :
              isInReview ? "Post is already under review" :
              "Submit this post for additional AI review"
            }
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">{isInReview ? 'Under Review' : 'Submit for Review'}</span>
            <span className="sm:hidden">{isInReview ? 'Review' : 'Submit'}</span>
          </button>

          {/* Finalize Draft button */}
          <button
            onClick={onFinalize}
            disabled={!canSubmit || isSaving || isDirty || isWorkflowDisabled}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              isWorkflowDisabled ? "Cannot finalize already finalized or published posts" :
              isDirty ? "Save your changes before finalizing" :
              "Mark this post as complete and ready for publication"
            }
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Finalize Draft</span>
            <span className="sm:hidden">Finalize</span>
          </button>
        </div>
      </div>

      {/* Help text */}
      <div className="mt-3 text-xs text-gray-500">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2">
          <div>
            {isWorkflowDisabled ?
              `This post is ${post?.status} and cannot be edited.` :
              'Save your work regularly. Changes are highlighted until saved.'
            }
          </div>
          {!isWorkflowDisabled && (
            <div className="hidden lg:flex items-center space-x-4">
              <span>
                <strong>Submit for Review:</strong> Get additional AI suggestions
              </span>
              <span>
                <strong>Finalize:</strong> Mark as complete and ready to publish
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
