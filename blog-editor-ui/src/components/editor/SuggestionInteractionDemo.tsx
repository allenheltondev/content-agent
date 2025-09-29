import React, { useState } from 'react';
import { SuggestionPopover } from './SuggestionPopover';
import type { Suggestion } from '../../types';

/**
 * Demo component to showcase the suggestion interaction UI
 * This demonstrates all the functionality implemented for task 11
 */
export const SuggestionInteractionDemo: React.FC = () => {
  const [showPopover, setShowPopover] = useState(false)
 const [acceptedSuggestions, setAcceptedSuggestions] = useState<string[]>([]);
  const [rejectedSuggestions, setRejectedSuggestions] = useState<string[]>([]);

  // Sample suggestions for different types
  const sampleSuggestions: Suggestion[] = [
    {
      id: 'spelling-1',
      contentId: 'demo',
      startOffset: 0,
      endOffset: 10,
      textToReplace: 'recieve',
      replaceWith: 'receive',
      reason: 'Correct spelling: "i" before "e" except after "c"',
      priority: 'high',
      type: 'spelling',
      contextBefore: '',
      contextAfter: ' the package',
      anchorText: 'recieve',
      createdAt: Date.now()
    },
    {
      id: 'grammar-1',
      contentId: 'demo',
      startOffset: 20,
      endOffset: 35,
      textToReplace: 'was went',
      replaceWith: 'went',
      reason: 'Remove redundant auxiliary verb',
      priority: 'medium',
      type: 'grammar',
      contextBefore: 'He ',
      contextAfter: ' to the store',
      anchorText: 'was went',
      createdAt: Date.now()
    },
    {
      id: 'llm-1',
      contentId: 'demo',
      startOffset: 40,
      endOffset: 55,
      textToReplace: 'very good',
      replaceWith: 'excellent',
      reason: 'More precise and impactful word choice',
      priority: 'low',
      type: 'llm',
      contextBefore: 'The product is ',
      contextAfter: ' for users',
      anchorText: 'very good',
      createdAt: Date.now()
    },
    {
      id: 'brand-1',
      contentId: 'demo',
      startOffset: 60,
      endOffset: 75,
      textToReplace: 'customers',
      replaceWith: 'users',
      reason: 'Use "users" instead of "customers" per brand guidelines',
      priority: 'high',
      type: 'brand',
      contextBefore: 'Our ',
      contextAfter: ' love this feature',
      anchorText: 'customers',
      createdAt: Date.now()
    },
    {
      id: 'fact-1',
      contentId: 'demo',
      startOffset: 80,
      endOffset: 95,
      textToReplace: '2020',
      replaceWith: '2024',
      reason: 'Update to current year for accuracy',
      priority: 'medium',
      type: 'fact',
      contextBefore: 'Since ',
      contextAfter: ', we have grown',
      anchorText: '2020',
      createdAt: Date.now()
    }
  ];

  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion>(sampleSuggestions[0]);

  const handleAccept = (id: string) => {
    setAcceptedSuggestions(prev => [...prev, id]);
    setShowPopover(false);
  };

  const handleReject = (id: string) => {
    setRejectedSuggestions(prev => [...prev, id]);
    setShowPopover(false);
  };

  const handleShowSuggestion = (suggestion: Suggestion) => {
    setCurrentSuggestion(suggestion);
    setShowPopover(true);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Suggestion Interaction UI Demo</h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Task 11 Implementation Features:</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>✅ SuggestionPopover component with Accept/Reject buttons</li>
          <li>✅ Click handling for suggestion acceptance and rejection</li>
          <li>✅ Suggestion details display with reason and type information</li>
          <li>✅ Smooth animations for suggestion state transitions</li>
          <li>✅ Type-specific color coding for visual distinction</li>
        </ul>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Suggestion Types Demo */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Try Different Suggestion Types</h3>
          <div className="space-y-3">
            {sampleSuggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleShowSuggestion(suggestion)}
                className={`
                  w-full text-left p-3 rounded-md border-2 transition-all duration-200
                  ${suggestion.type === 'spelling' ? 'bg-red-50 border-red-200 hover:bg-red-100' : ''}
                  ${suggestion.type === 'grammar' ? 'bg-green-50 border-green-200 hover:bg-green-100' : ''}
                  ${suggestion.type === 'llm' ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : ''}
                  ${suggestion.type === 'brand' ? 'bg-purple-50 border-purple-200 hover:bg-purple-100' : ''}
                  ${suggestion.type === 'fact' ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' : ''}
                `}
              >
                <div className="font-medium capitalize">{suggestion.type} Suggestion</div>
                <div className="text-sm text-gray-600 mt-1">
                  "{suggestion.textToReplace}" → "{suggestion.replaceWith}"
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Action History</h3>

          <div className="mb-4">
            <h4 className="font-medium text-green-700 mb-2">Accepted Suggestions:</h4>
            {acceptedSuggestions.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-gray-600">
                {acceptedSuggestions.map(id => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">None yet</p>
            )}
          </div>

          <div>
            <h4 className="font-medium text-red-700 mb-2">Rejected Suggestions:</h4>
            {rejectedSuggestions.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-gray-600">
                {rejectedSuggestions.map(id => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">None yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Popover Demo */}
      {showPopover && (
        <SuggestionPopover
          suggestion={currentSuggestion}
          onAccept={handleAccept}
          onReject={handleReject}
          position={{ top: 300, left: 400 }}
          onClose={() => setShowPopover(false)}
        />
      )}

      {/* Overlay to close popover */}
      {showPopover && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPopover(false)}
        />
      )}
    </div>
  );
};
