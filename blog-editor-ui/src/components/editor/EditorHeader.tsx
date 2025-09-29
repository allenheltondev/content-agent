import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface EditorHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  onSave: () => void;
}

export const EditorHeader = ({
  title,
  onTitleChange,
  isSaving,
  isDirty,
  lastSaved,
  onSave
}: EditorHeaderProps) => {
  const navigate = useNavigate();
  const [titleValue, setTitleValue] = useState(title);

  // Update local title when prop changes
  useEffect(() => {
    setTitleValue(title);
  }, [title]);

  // Handle title input changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitleValue(newTitle);
    onTitleChange(newTitle);
  };

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
    if (isSaving) {
      return (
        <div className="flex items-center text-sm text-blue-600">
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

          {/* Title input */}
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={titleValue}
              onChange={handleTitleChange}
              placeholder="Enter post title..."
              className="w-full text-lg sm:text-xl font-semibold text-gray-900 placeholder-gray-400 border-none outline-none focus:ring-0 p-0 bg-transparent"
              maxLength={200}
            />
          </div>
        </div>

        {/* Save status and actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="text-left sm:text-right order-2 sm:order-1">
            <SaveStatus />
            <div className="text-xs text-gray-500 mt-1">
              {formatLastSaved(lastSaved)}
            </div>
          </div>

         {/* Manual save button */}
          <button
            onClick={onSave}
            disabled={!isDirty || isSaving}
            className="order-1 sm:order-2 w-full sm:w-auto inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Save now (Ctrl+S)"
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Save Now</span>
            <span className="sm:hidden">Save</span>
          </button>
        </div>
      </div>

      {/* Character count for title */}
      {titleValue.length > 150 && (
        <div className="mt-2 text-xs text-gray-500">
          Title: {titleValue.length}/200 characters
        </div>
      )}
    </div>
  );
};
