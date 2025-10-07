import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/common/AppHeader';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { useApi } from '../hooks/useApi';
import { usePageTitle } from '../hooks/usePageTitle';
import type { StatsResponse, SuggestionType } from '../types';

// Color mapping for suggestion types
const suggestionTypeColors: Record<SuggestionType, string> = {
  llm: 'bg-blue-200 border-blue-400 text-blue-800',
  brand: 'bg-purple-200 border-purple-400 text-purple-800',
  fact: 'bg-orange-200 border-orange-400 text-orange-800',
  grammar: 'bg-green-200 border-green-400 text-green-800',
  spelling: 'bg-red-200 border-red-400 text-red-800'
};

// Insight type icons and colors
const insightTypeConfig = {
  strength: {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-green-600 bg-green-50 border-green-200'
  },
  improvement: {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-blue-600 bg-blue-50 border-blue-200'
  },
  observation: {
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    color: 'text-gray-600 bg-gray-50 border-gray-200'
  }
};

export const AboutMyWritingPage: React.FC = () => {
  const navigate = useNavigate();
  const { execute, loading: isLoading, error } = useApi<StatsResponse>();
  const [stats, setStats] = useState<StatsResponse | null>(null);

  usePageTitle('About My Writing');

  const fetchStats = async () => {
    const { apiService } = await import('../services');
    await execute(
      (signal) => apiService.getStats(signal),
      {
        onSuccess: (data) => setStats(data),
        logContext: 'AboutMyWritingPage.fetchStats'
      }
    );
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  const formatSuggestionTypeName = (type: SuggestionType): string => {
    const names: Record<SuggestionType, string> = {
      llm: 'AI Suggestions',
      brand: 'Brand Guidelines',
      fact: 'Fact Checking',
      grammar: 'Grammar',
      spelling: 'Spelling'
    };
    return names[type];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingSpinner />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <ErrorDisplay
              error={error}
              onRetry={fetchStats}
              variant="card"
            />
          </div>
        </main>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AppHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-gray-500">No statistics available</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="main-content">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900">About My Writing</h1>
            <p className="mt-2 text-gray-600">
              Insights and statistics about your writing journey with Betterer
            </p>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Posts</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalPosts}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Suggestions</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.totalSuggestions}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Acceptance Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatPercentage(stats.acceptanceRate)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg. Post Length</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.writingPatterns.averagePostLength}</p>
                  <p className="text-xs text-gray-500">words</p>
                </div>
              </div>
            </div>
          </div>

          {/* Suggestions by Type */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Suggestions by Type</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.suggestionsByType).map(([type, typeStats]) => (
                  <div
                    key={type}
                    className={`border-2 rounded-lg p-4 ${suggestionTypeColors[type as SuggestionType]}`}
                  >
                    <h3 className="font-medium mb-2">{formatSuggestionTypeName(type as SuggestionType)}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-medium">{typeStats.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Accepted:</span>
                        <span className="font-medium">{typeStats.accepted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rejected:</span>
                        <span className="font-medium">{typeStats.rejected}</span>
                      </div>
                      {typeStats.total > 0 && (
                        <div className="flex justify-between pt-1 border-t border-current border-opacity-30">
                          <span>Rate:</span>
                          <span className="font-medium">
                            {formatPercentage(typeStats.accepted / typeStats.total)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Writing Insights */}
          {stats.insights && stats.insights.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">AI-Powered Writing Insights</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Personalized recommendations based on your writing patterns
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {stats.insights.map((insight, index) => {
                    const config = insightTypeConfig[insight.type];
                    return (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 ${config.color}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {config.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-sm font-medium capitalize">
                                {insight.type} • {insight.category.replace('_', ' ')}
                              </h3>
                              <span className="text-xs opacity-75">
                                {Math.round(insight.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="text-sm">{insight.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Writing Patterns */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Writing Patterns</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Common Topics</h3>
                  {stats.writingPatterns.commonTopics.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {stats.writingPatterns.commonTopics.map((topic, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No common topics identified yet</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Writing Trends</h3>
                  <p className="text-sm text-gray-600">
                    {stats.writingPatterns.writingTrends || 'No trends identified yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
