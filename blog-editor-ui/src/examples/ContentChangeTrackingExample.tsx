import { useState } from 'react';
import { EditorModeProvider } from '../contexts/EditorModeContext';
import { useContentChangeTracker } from '../hooks/useContentChangeTracker';
import { ContentChangeSummary, ContentChangeIndicator } from '../components/editor/ContentChangeSummary';

/**
 * Example component demonstrating content change tracking functionality
 * This shows how to integrate the content change tracking system with an editor
 */
function EditorWithChangeTracking() {
  const [content, setContent] = useState('This is some initial content for the editor.');
  const { trackChange, initializeTracker, resetTracker } = useContentChangeTracker();

  // Initialize tracker when component mounts
  useState(() => {
    initializeTracker(content);
  });

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    trackChange(newContent);
  };

  const handleReset = () => {
    const newContent = 'Reset content for testing.';
    setContent(newContent);
    resetTracker(newContent);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Content Editor with Change Tracking</h3>
        <div className="flex items-center gap-2">
          <ContentChangeIndicator />
          <button
            onClick={handleReset}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
          >
            Reset Content
          </button>
        </div>
      </div>

      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        className="w-full h-32 p-3 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Start typing to see change tracking in action..."
      />

      <ContentChangeSummary showDetails={true} className="p-3 bg-gray-50 rounded-md" />
    </div>
  );
}

/**
 * Full example with EditorModeProvider wrapper
 */
export function ContentChangeTrackingExample() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Content Change Tracking Example</h2>

      <div className="space-y-6">
        <div className="prose">
          <p>
            This example demonstrates the content change tracking system. The system:
          </p>
          <ul>
            <li>Tracks all content modifications in Edit mode</li>
            <li>Calculates diffs between old and new content</li>
            <li>Provides summaries of changes</li>
            <li>Integrates with the Editor Mode system</li>
          </ul>
        </div>

        <EditorModeProvider>
          <EditorWithChangeTracking />
        </EditorModeProvider>

        <div className="text-sm text-gray-600">
          <p><strong>Try this:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Type some text in the editor above</li>
            <li>Notice the "Modified" indicator appears</li>
            <li>See the change summary below the editor</li>
            <li>Click "Reset Content" to clear changes</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
