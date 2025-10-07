import { useState } from 'react';
import { EditorErrorBoundary } from './EditorErrorBoundary';
import { EditorFallbackUI } from './EditorFallbackUI';
import { ErrorReportingManager } from '../../utils/errorReporting';
import { EditorBackupManager } from '../../utils/editorBackup';

/**
 * Test component for error boundary functionality
 * This component can be used to test error handling in development
 */

interface ErrorTriggerProps {
  onError?: () => void;
}

const ErrorTrigger: React.FC<ErrorTriggerProps> = ({ onError }) => {
  const [shouldError, setShouldError] = useState(false);

  if (shouldError) {
    onError?.();
    throw new Error('Test error triggered by ErrorBoundaryTest component');
  }

  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-medium mb-4">Error Boundary Test</h3>
      <p className="text-sm text-gray-600 mb-4">
        This component can trigger errors to test the error boundary functionality.
      </p>

      <div className="space-y-3">
        <button
          onClick={() => setShouldError(true)}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
        >
          Trigger Component Error
        </button>

        <button
          onClick={() => {
            throw new Error('Immediate error for testing');
          }}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm ml-2"
        >
          Trigger Immediate Error
        </button>

        <button
          onClick={() => {
            // Test error reporting
            ErrorReportingManager.reportEditorError(
              new Error('Test error report'),
              'test-post-id',
              'ErrorBoundaryTest',
              true,
              { testData: 'This is a test error report' }
            );
            alert('Error report created (check console)');
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm ml-2"
        >
          Test Error Reporting
        </button>

        <button
          onClick={() => {
            // Test backup creation
            const backupId = EditorBackupManager.createBackup(
              'test-post-id',
              'Test Title',
              'Test content for backup functionality',
              'manual'
            );
            alert(`Backup created with ID: ${backupId} (check localStorage)`);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm ml-2"
        >
          Test Backup Creation
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>• Component errors will be caught by the error boundary</p>
        <p>• Error reports will be logged to console and localStorage</p>
        <p>• Backups will be saved to localStorage with unique keys</p>
      </div>
    </div>
  );
};

export const ErrorBoundaryTest: React.FC = () => {
  return (
    <EditorErrorBoundary
      postId="test-post-id"
      title="Test Title"
      content="Test content for error boundary testing"
      onError={(error, errorInfo) => {
        console.log('Error boundary caught error:', error, errorInfo);
      }}
      fallback={(error, actions) => (
        <EditorFallbackUI
          error={error}
          onRetry={actions.retry}
          onSaveBackup={actions.saveBackup}
          postId="test-post-id"
          title="Test Title"
          content="Test content"
          componentName="Error Boundary Test"
        />
      )}
    >
      <ErrorTrigger />
    </EditorErrorBoundary>
  );
};
