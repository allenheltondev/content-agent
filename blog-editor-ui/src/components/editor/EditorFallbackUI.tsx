import { useState } from 'react';
import { LocalStorageManager } from '../../utils/localStorage';

interface EditorFallbackUIProps {
  error: Error;
  onRetry: () => void;
  onSaveBackup?: () => void;
  postId?: string | null;
  title?: string;
  content?: string;
  componentName?: string;
}

/**
 * Fallback UI component for editor component failures
 * Provides a minimal interface to recover content and retry operations
 */
export const EditorFallbackUI: React.FC<EditorFallbackUIProps> = ({
  error,
  onRetry,
  onSaveBackup,
  postId,
  title,
  content,
  componentName = 'Editor Component'
}) => {
  const [isBackupSaved, setIsBackupSaved] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const hasContent = Boolean(title?.trim() || content?.trim());

  const handleSaveBackup = () => {
    try {
      if (!hasContent) {
        return;
      }

      const backupKey = `fallback_backup_${postId || 'new'}_${Date.now()}`;
      const backupData = {
        postId,
        title: title || '',
        content: content || '',
        timestamp: Date.now(),
        componentName,
        errorMessage: error.message
      };

      localStorage.setItem(backupKey, JSON.stringify(backupData));
      setIsBackupSaved(true);
      onSaveBackup?.();
    } catch (backupError) {
      console.warn('Failed to save backup:', backupError);
    }
  };

  const handleClearStorage = () => {
    try {
      LocalStorageManager.cleanupOldDrafts();
      alert('Old drafts cleared. Please refresh the page.');
    } catch (error) {
      console.warn('Failed to clear storage:', error);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-4">
      <div className="flex items-start">
        {/* Warning Icon */}
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="ml-3 flex-1">
          {/* Error Header */}
          <h3 className="text-lg font-medium text-yellow-800 mb-2">
            {componentName} Temporarily Unavailable
          </h3>

          <p className="text-yellow-700 mb-4">
            This component encountered an error and is temporarily unavailable.
            Your content is safe and can be recovered.
          </p>

          {/* Content Status */}
          {hasContent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-blue-800">
                  Content detected: {title?.trim() ? 'Title' : ''} {title?.trim() && content?.trim() ? '& ' : ''} {content?.trim() ? 'Content' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Backup Status */}
          {isBackupSaved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-green-800">
                  Content backed up successfully
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mb-4">
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Component
            </button>

            {hasContent && !isBackupSaved && (
              <button
                onClick={handleSaveBackup}
                className="inline-flex items-center px-4 py-2 border border-yellow-300 text-sm font-medium rounded-md text-yellow-700 bg-white hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Save Backup
              </button>
            )}

            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Page
            </button>
          </div>

          {/* Error Details Toggle */}
          <div className="border-t border-yellow-200 pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-yellow-700 hover:text-yellow-800 font-medium flex items-center"
            >
              <svg
                className={`h-4 w-4 mr-1 transform transition-transform ${showDetails ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showDetails ? 'Hide' : 'Show'} Error Details
            </button>

            {showDetails && (
              <div className="mt-3 space-y-3">
                <div>
                  <span className="text-xs font-medium text-yellow-700">Component:</span>
                  <p className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded mt-1">
                    {componentName}
                  </p>
                </div>

                <div>
                  <span className="text-xs font-medium text-yellow-700">Error Message:</span>
                  <pre className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded mt-1 overflow-auto">
                    {error.message}
                  </pre>
                </div>

                {error.stack && (
                  <div>
                    <span className="text-xs font-medium text-yellow-700">Stack Trace:</span>
                    <pre className="text-xs text-yellow-600 bg-yellow-100 p-2 rounded mt-1 overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleClearStorage}
                    className="text-xs px-3 py-1 border border-yellow-300 rounded text-yellow-700 bg-white hover:bg-yellow-50"
                  >
                    Clear Old Drafts
                  </button>

                  <button
                    onClick={() => console.log('Error details:', { error, postId, hasContent })}
                    className="text-xs px-3 py-1 border border-yellow-300 rounded text-yellow-700 bg-white hover:bg-yellow-50"
                  >
                    Log to Console
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recovery Instructions */}
          <div className="mt-4 text-xs text-yellow-600 bg-yellow-100 rounded-lg p-3">
            <p className="font-medium mb-2">Recovery Steps:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Try the "Retry Component" button first</li>
              <li>Save a backup if you have unsaved content</li>
              <li>Check browser console for additional details</li>
              <li>Clear old drafts if storage is full</li>
              <li>Refresh the page as a last resort</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
