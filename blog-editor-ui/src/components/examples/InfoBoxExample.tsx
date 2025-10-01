import React, { useState } from 'react';
import { InfoBox } from '../common';

/**
 * InfoBox Example Component
 *
 * This component demonstrates the InfoBox functionality and can be used
 * for manual testing during development.
 */
export const InfoBoxExample: React.FC = () => {
  const [dismissedBoxes, setDismissedBoxes] = useState<Set<string>>(new Set());

  const handleDismiss = (id: string) => {
    setDismissedBoxes(prev => new Set([...prev, id]));
  };

  const resetBoxes = () => {
    setDismissedBoxes(new Set());
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-tertiary">InfoBox Examples</h2>
        <button
          onClick={resetBoxes}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Info type example */}
      {!dismissedBoxes.has('welcome-info') && (
        <InfoBox
          id="welcome-info"
          type="info"
          title="Welcome to Betterer!"
          content="This is an informational message that helps users understand what they're seeing. Click the X to dismiss it."
          onDismiss={() => handleDismiss('welcome-info')}
        />
      )}

      {/* Tip type example */}
      {!dismissedBoxes.has('editor-tip') && (
        <InfoBox
          id="editor-tip"
          type="tip"
          title="Pro Tip"
          content={
            <div>
              <p>You can use keyboard shortcuts to speed up your editing:</p>
              <ul className="mt-2 ml-4 list-disc">
                <li><kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+S</kbd> to save</li>
                <li><kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Ctrl+Z</kbd> to undo</li>
              </ul>
            </div>
          }
          onDismiss={() => handleDismiss('editor-tip')}
        />
      )}

      {/* Warning type example */}
      {!dismissedBoxes.has('auth-warning') && (
        <InfoBox
          id="auth-warning"
          type="warning"
          title="Session Expiring Soon"
          content="Your session will expire in 5 minutes. Please save your work and refresh the page to continue."
          onDismiss={() => handleDismiss('auth-warning')}
        />
      )}

      {/* Non-dismissible example */}
      <InfoBox
        id="permanent-info"
        type="info"
        title="System Status"
        content="All systems are operational. This message cannot be dismissed."
      />

      {/* Custom styling example */}
      {!dismissedBoxes.has('custom-style') && (
        <InfoBox
          id="custom-style"
          type="tip"
          title="Custom Styled InfoBox"
          content="This InfoBox has custom styling applied through the className prop."
          onDismiss={() => handleDismiss('custom-style')}
          className="border-2 shadow-lg"
        />
      )}

      {/* Status display */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-tertiary mb-2">Dismissed Boxes:</h3>
        {dismissedBoxes.size === 0 ? (
          <p className="text-gray-600">No boxes dismissed yet</p>
        ) : (
          <ul className="list-disc list-inside text-gray-600">
            {Array.from(dismissedBoxes).map(id => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
