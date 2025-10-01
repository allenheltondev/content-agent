import React from 'react';
import { useInfoBoxManager } from '../../hooks/useInfoBoxManager';

/**
 * Demo component for testing useInfoBoxManager hook functionality
 * This component can be temporarily added to any page for manual testing
 */
export const InfoBoxManagerDemo: React.FC = () => {
  const { isDismissed, dismissInfoBox, resetAllInfoBoxes, isStorageAvailable } = useInfoBoxManager();

  const testBoxes = [
    { id: 'demo-welcome', title: 'Welcome Box' },
    { id: 'demo-tip', title: 'Tip Box' },
    { id: 'demo-warning', title: 'Warning Box' },
  ];

  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 m-4">
      <h3 className="text-lg font-semibold mb-4">InfoBox Manager Demo</h3>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Storage Available: <span className={isStorageAvailable ? 'text-green-600' : 'text-red-600'}>
            {isStorageAvailable ? '✅ Yes' : '❌ No'}
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {testBoxes.map((box) => (
          <div key={box.id} className="flex items-center justify-between p-3 border rounded">
            <div>
              <span className="font-medium">{box.title}</span>
              <span className="ml-2 text-sm">
                Status: <span className={isDismissed(box.id) ? 'text-red-600' : 'text-green-600'}>
                  {isDismissed(box.id) ? 'Dismissed' : 'Visible'}
                </span>
              </span>
            </div>
            <button
              onClick={() => dismissInfoBox(box.id)}
              disabled={isDismissed(box.id)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t">
        <button
          onClick={resetAllInfoBoxes}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Reset All InfoBoxes
        </button>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>Manual Testing Instructions:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Click "Dismiss" buttons to test dismissal functionality</li>
          <li>Refresh the page to test persistence</li>
          <li>Check localStorage in dev tools (Application tab)</li>
          <li>Use "Reset All" to clear all dismissed states</li>
          <li>Test in incognito mode to verify graceful degradation</li>
        </ul>
      </div>
    </div>
  );
};
