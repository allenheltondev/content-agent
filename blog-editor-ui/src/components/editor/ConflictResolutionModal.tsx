import { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { ConflictData, ConflictResolution } from '../../utils/conflictResolution';
import { getConflictSummary, mergeTitle, mergeContent } from '../../utils/conflictResolution';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflictData: ConflictData;
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
}

export const ConflictResolutionModal = ({
  isOpen,
  conflictData,
  onResolve,
  onCancel
}: ConflictResolutionModalProps) => {
  const [selectedAction, setSelectedAction] = useState<'use_server' | 'use_local' | 'merge'>('use_server');
  const [mergedTitle, setMergedTitle] = useState(() =>
    mergeTitle(conflictData.serverVersion.title, conflictData.localTitle)
  );
  const [mergedContent, setMergedContent] = useState(() =>
    mergeContent(conflictData.serverVersion.body, conflictData.localContent)
  );

  if (!isOpen) return null;

  const summary = getConflictSummary(conflictData);

  const handleResolve = () => {
    const resolution: ConflictResolution = {
      action: selectedAction,
      title: selectedAction === 'merge' ? mergedTitle : '',
      content: selectedAction === 'merge' ? mergedContent : ''
    };
    onResolve(resolution);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Resolve Content Conflict</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Conflict Summary */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-medium text-amber-800 mb-2">Conflict Detected</h3>
            <p className="text-sm text-amber-700 mb-3">
              The post has been modified both locally and on the server. Please choose how to resolve this conflict.
            </p>
            <div className="text-xs text-amber-600 space-y-1">
              <div>Server last modified: {summary.serverLastModified.toLocaleString()}</div>
              <div>Local last modified: {summary.localLastModified.toLocaleString()}</div>
              {summary.titleChanged && <div>• Title has changed</div>}
              {summary.contentChanged && <div>• Content has changed</div>}
            </div>
          </div>

          {/* Resolution Options */}
          <div className="space-y-4 mb-6">
            <h3 className="font-medium text-gray-900">Choose Resolution:</h3>

            {/* Use Server Version */}
            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="resolution"
                value="use_server"
                checked={selectedAction === 'use_server'}
                onChange={(e) => setSelectedAction(e.target.value as any)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Use Server Version</div>
                <div className="text-sm text-gray-600 mt-1">
                  Discard local changes and use the version from the server
                </div>
              </div>
            </label>

            {/* Use Local Version */}
            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="resolution"
                value="use_local"
                checked={selectedAction === 'use_local'}
                onChange={(e) => setSelectedAction(e.target.value as any)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Use Local Version</div>
                <div className="text-sm text-gray-600 mt-1">
                  Keep local changes and overwrite the server version
                </div>
              </div>
            </label>

            {/* Merge Versions */}
            <label className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="resolution"
                value="merge"
                checked={selectedAction === 'merge'}
                onChange={(e) => setSelectedAction(e.target.value as any)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Merge Versions</div>
                <div className="text-sm text-gray-600 mt-1">
                  Combine both versions (you can edit the result below)
                </div>
              </div>
            </label>
          </div>

          {/* Merge Editor */}
          {selectedAction === 'merge' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Edit Merged Content:</h4>

              {/* Merged Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title:</label>
                <input
                  type="text"
                  value={mergedTitle}
                  onChange={(e) => setMergedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Merged Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content:</label>
                <textarea
                  value={mergedContent}
                  onChange={(e) => setMergedContent(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Resolve Conflict
          </button>
        </div>
      </div>
    </div>
  );
};
