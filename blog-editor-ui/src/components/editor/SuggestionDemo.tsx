import { useState } from 'react';
import { ContentEditorWithSuggestions } from './ContentEditorWithSuggestions';
import type { Suggestion } from '../../types';

/**
 * Demo component to test the suggestion highlighting system
 */
export const SuggestionDemo = () => {
  const [content, setContent] = useState(`This is a sample blog post with some text that has various types of suggestions. The AI system can detect grammar issues, spelling mistakes, brand guideline violations, and factual inaccuracies.

For example, this sentance has a spelling error. And this paragraph could use better brand voice alignment according to our guidelines.

The system also provides LLM-based suggestions for improving overall content quality and readability.`);

  // Sample suggestions for demonstration
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    {
      id: 'suggestion-1',
      contentId: 'demo-content',
      startOffset: 185, // "sentance"
      endOffset: 193,
      textToReplace: 'sentance',
      replaceWith: 'sentence',
      reason: 'Correct spelling of "sentence"',
      priority: 'high',
      type: 'spelling',
      contextBefore: 'example, this ',
      contextAfter: ' has a spelling',
      anchorText: 'sentance',
      createdAt: Date.now() - 1000
    },
    {
      id: 'suggestion-2',
      contentId: 'demo-content',
      startOffset: 220, // "And this paragraph"
      endOffset: 280,
      textToReplace: 'And this paragraph could use better brand voice alignment',
      replaceWith: 'This paragraph would benefit from stronger brand voice alignment',
      reason: 'Use more confident, active voice that aligns with brand guidelines',
      priority: 'medium',
      type: 'brand',
      contextBefore: 'spelling error. ',
      contextAfter: ' according to our',
      anchorText: 'And this paragraph',
      createdAt: Date.now() - 2000
    },
    {
      id: 'suggestion-3',
      contentId: 'demo-content',
      startOffset: 50, // "various types"
      endOffset: 63,
      textToReplace: 'various types',
      replaceWith: 'multiple categories',
      reason: 'More precise terminology for better clarity',
      priority: 'low',
      type: 'llm',
      contextBefore: 'that has ',
      contextAfter: ' of suggestions',
      anchorText: 'various types',
      createdAt: Date.now() - 3000
    },
    {
      id: 'suggestion-4',
      contentId: 'demo-content',
      startOffset: 100, // "grammar issues"
      endOffset: 114,
      textToReplace: 'grammar issues',
      replaceWith: 'grammatical errors',
      reason: 'More formal and precise terminology',
      priority: 'medium',
      type: 'grammar',
      contextBefore: 'can detect ',
      contextAfter: ', spelling mistakes',
      anchorText: 'grammar issues',
      createdAt: Date.now() - 4000
    },
    {
      id: 'suggestion-5',
      contentId: 'demo-content',
      startOffset: 140, // "factual inaccuracies"
      endOffset: 160,
      textToReplace: 'factual inaccuracies',
      replaceWith: 'factual errors',
      reason: 'Simpler, more direct language',
      priority: 'low',
      type: 'fact',
      contextBefore: 'violations, and ',
      contextAfter: '.\n\nFor example',
      anchorText: 'factual inaccuracies',
      createdAt: Date.now() - 5000
    }
  ]);

  const handleAcceptSuggestion = (suggestionId: string) => {
    console.log('Accepting suggestion:', suggestionId);
    // Remove the suggestion from the list
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const handleRejectSuggestion = (suggestionId: string) => {
    console.log('Rejecting suggestion:', suggestionId);
    // Remove the suggestion from the list
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Suggestion Highlighting Demo
        </h1>
        <p className="text-gray-600">
          This demo shows the suggestion highlighting system in action.
          Hover over highlighted text to see suggestions and interact with them.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Blog Post Editor</h2>
          <p className="text-sm text-gray-500 mt-1">
            {suggestions.length} active suggestions
          </p>
        </div>

        <div className="p-6">
          <ContentEditorWithSuggestions
            content={content}
            suggestions={suggestions}
            onChange={handleContentChange}
            onAcceptSuggestion={handleAcceptSuggestion}
            onRejectSuggestion={handleRejectSuggestion}
            placeholder="Start writing your blog post..."
            showSuggestions={true}
          />
        </div>
      </div>

      {/* Suggestion statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { type: 'spelling', color: 'red', count: suggestions.filter(s => s.type === 'spelling').length },
          { type: 'grammar', color: 'green', count: suggestions.filter(s => s.type === 'grammar').length },
          { type: 'brand', color: 'purple', count: suggestions.filter(s => s.type === 'brand').length },
          { type: 'fact', color: 'orange', count: suggestions.filter(s => s.type === 'fact').length },
          { type: 'llm', color: 'blue', count: suggestions.filter(s => s.type === 'llm').length }
        ].map(({ type, color, count }) => (
          <div key={type} className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 bg-${color}-200 border border-${color}-400 rounded-sm`} />
              <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-gray-900">{count}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
