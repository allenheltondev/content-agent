
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface EditorHeaderProps {
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  onSave: () => void;
  isNewPost?: boolean;
}

export const EditorHeader = ({
  isSaving,
  isDirty,
  lastSaved,
  onSave,
  isNewPost = false
}: EditorHeaderProps) => {
  const navigate = useNavigate();

  // Format last saved time
  const formatLastSaved = (date: Date | null) => {
    if (!date) return 'Never saved';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just saved';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    return date.toLocaleDateString();
  };

  // Save status indicator
  const SaveStatus = () => {
    if (isNewPost) {
      if (isSaving) {
        return (
          <div className="flex items-center text-sm text-primary">
            <CloudArrowUpIcon className="h-4 w-4 mr-1 animate-pulse" />
            Creating post...
          </div>
        );
      }

      return (
        <div className="flex items-center text-sm text-gray-500">
          <div className="h-2 w-2 bg-orange-400 rounded-full mr-2" />
          Ready to create
        </div>
      );
    }

    if (isSaving) {
      return (
        <div className="flex items-center text-sm text-primary">
          <CloudArrowUpIcon className="h-4 w-4 mr-1 animate-pulse" />
          Auto-saving...
        </div>
      );
    }

    if (isDirty) {
      return (
        <div className="flex items-center text-sm text-orange-600">
          <div className="h-2 w-2 bg-orange-600 rounded-full mr-2 animate-pulse" />
          Auto-save pending
        </div>
      );
    }

    return (
      <div className="flex items-center text-sm text-green-600">
        <CheckCircleIcon className="h-4 w-4 mr-1" />
        Auto-saved
      </div>
    );
  };

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
          {/* Back button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-shrink-0 inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>

          {/* Editor title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
              {isNewPost ? 'New Post' : 'Edit Post'}
            </h1>
          </div>
        </div>

        {/* Save status and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="text-left sm:text-right order-2 sm:order-1">
            <SaveStatus />
            <div className="text-xs text-gray-500 mt-1">
              {isNewPost ? 'Click Create Post to save' : formatLastSaved(lastSaved)}
            </div>
          </div>

         {/* Manual save button */}
          <button
            onClick={onSave}
            disabled={isNewPost ? isSaving : (!isDirty || isSaving)}
            className="order-1 sm:order-2 w-full sm:w-auto inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={isNewPost ? "Create post" : "Save now (Ctrl+S)"}
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">{isNewPost ? 'Create Post' : 'Save Now'}</span>
            <span className="sm:hidden">{isNewPost ? 'Create' : 'Save'}</span>
          </button>
        </div>
      </div>


    </div>
  );
};
