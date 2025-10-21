import React, { useState } from 'react';
import { EditorModeProvider } from '../contexts/EditorModeContext';
import { ModeToggleButton } from '../components/editor/ModeToggleButton';
import { TransitionProgressIndicator, CompactTransitionIndicator, TransitionToast } from '../components/editor/TransitionProgressIndicator';
import { useTransitionManager } from '../hooks/useTransitionManager';
import type { Suggestion } from '../types';

/**
 * Example component demonstrating ModeTransitionManager functionality
 */
const ModeTransitionDemo: React.FC = () => {
  const {
    isTransitioning,
    currentProgress,
    lastTransitionError,
    showRetryButton,
    retry,
    dismissError,
    progressMessage,
    progressPercentage,
    currentPhase,
  } = useTransitionManager();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Mode Toggle with Transition Management</h3>

        <div className="flex items-center justify-between mb-4">
          <ModeToggleButton
            size="md"
            showProgressIndicator={true}
            showTooltip={true}
          />

          <div className="text-sm text-gray-600">
            Status: {isTransitioning ? 'Transitioning' : 'Ready'}
          </div>
        </div>

        {/* Compact progress indicator */}
        <CompactTransitionIndicator className="mb-4" />

        {/* Transition details */}
        {currentProgress && (
          <div className="bg-gray-50 p-4 rounded border">
            <h4 className="font-medium mb-2">Transition Details</h4>
            <div className="space-y-2 text-sm">
              <div>Phase: <span className="font-mono">{currentPhase}</span></div>
              <div>Progress: {progressPercentage}%</div>
              <div>Message: {progressMessage}</div>
            </div>
          </div>
        )}

        {/* Error handling */}
        {lastTransitionError && (
          <div className="bg-red-50 border border-red-200 p-4 rounded mt-4">
            <h4 className="font-medium text-red-800 mb-2">Transition Error</h4>
            <p className="text-sm text-red-600 mb-3">{lastTransitionError}</p>
            <div className="flex space-x-2">
              {showRetryButton && (
                <button
                  onClick={retry}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Retry Transition
                </button>
              )}
              <button
                onClick={dismissError}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Dismiss Error
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Mock editor component for demonstration
 */
const MockEditor: React.FC = () => {
  const [content, setContent] = useState('This is sample content for testing mode transitions...');

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-32 resize-none border-none outline-none"
        placeholder="Type your content here..."
      />
    </div>
  );
};

/**
 * Full example with EditorModeProvider wrapper
 */
export const ModeTransitionExample: React.FC = () => {
  const [showToast, setShowToast] = useState(false);
  const [showTopProgress, setShowTopProgress] = useState(true);

  // Mock suggestions for demonstration
  const mockSuggestions: Suggestion[] = [
    {
      id: '1',
      type: 'grammar',
      startOffset: 10,
      endOffset: 20,
      originalText: 'sample',
      suggestedText: 'example',
      explanation: 'More precise word choice',
      confidence: 0.9,
      status: 'pending'
    }
  ];

  // Mock suggestion recalculation function
  const handleSuggestionRecalculation = async (content: string, suggestions: Suggestion[]) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Return updated suggestions (in real app, this would call the API)
    return suggestions.map(s => ({
      ...s,
      // Simulate position updates
      startOffset: s.startOffset + Math.floor(Math.random() * 5),
      endOffset: s.endOffset + Math.floor(Math.random() * 5),
    }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Mode Transition Manager Demo</h1>
        <p className="text-gray-600">
          Demonstrates smooth transitions between Edit and Review modes with progress tracking and error handling.
        </p>
      </div>

      {/* Configuration controls */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-3">Demo Controls</h3>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={showTopProgress}
              onChange={(e) => setShowTopProgress(e.target.checked)}
              className="mr-2"
            />
            Show Top Progress Bar
          </label>
          <button
            onClick={() => setShowToast(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Show Toast Notification
          </button>
        </div>
      </div>

      <EditorModeProvider
        onSuggestionRecalculation={handleSuggestionRecalculation}
        currentSuggestions={mockSuggestions}
        postId="demo-post-123"
      >
        {/* Top progress indicator */}
        {showTopProgress && (
          <TransitionProgressIndicator
            position="top"
            showDetails={true}
          />
        )}

        {/* Main demo content */}
        <ModeTransitionDemo />

        {/* Mock editor */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Sample Editor</h3>
          <MockEditor />
        </div>

        {/* Toast notification */}
        {showToast && (
          <TransitionToast onClose={() => setShowToast(false)} />
        )}
      </EditorModeProvider>

      {/* Documentation */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">How to Test</h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-700">
          <li>Click the mode toggle button to switch between Edit and Review modes</li>
          <li>Watch the progress indicators during transitions</li>
          <li>Modify content in Edit mode, then switch to Review to see recalculation</li>
          <li>Observe error handling if network issues occur (simulated)</li>
          <li>Use retry functionality when transitions fail</li>
        </ol>
      </div>
    </div>
  );
};
