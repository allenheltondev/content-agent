import { useState, useEffect } from 'react';
import { apiService } from '../../services';
import type { TenantStats } from '../../types';

interface StatsOverviewProps {
  className?: string;
}

export const StatsOverview = ({ className = '' }: StatsOverviewProps) => {
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiService.getStats();

        // Transform the full stats response to the simplified TenantStats format
        const tenantStats: TenantStats = {
          totalPosts: response.totalPosts,
          totalSuggestions: response.totalSuggestions,
          acceptanceRate: response.acceptanceRate
        };

        setStats(tenantStats);
      } catch (err) {
        console.error('Failed to fetch statistics:', err);
        setError('Failed to load statistics');

        // Set default values on error
        setStats({
          totalPosts: 0,
          totalSuggestions: 0,
          acceptanceRate: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatAcceptanceRate = (rate: number): string => {
    return `${Math.round(rate * 100)}%`;
  };

  if (error && !stats) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 ${className}`}>
      {/* Total Posts */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center">
          <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
            <svg className="h-5 w-5 sm:h-6 sm:w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="ml-3 sm:ml-4 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Total Posts</p>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-6 sm:h-8 bg-gray-200 rounded w-12"></div>
              </div>
            ) : (
              <p className="text-xl sm:text-2xl font-bold text-tertiary">{stats?.totalPosts || 0}</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
        <div className="flex items-center">
          <div className="p-2 sm:p-3 bg-secondary/10 rounded-lg flex-shrink-0">
            <svg className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="ml-3 sm:ml-4 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600">AI Suggestions</p>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-6 sm:h-8 bg-gray-200 rounded w-12"></div>
              </div>
            ) : (
              <p className="text-xl sm:text-2xl font-bold text-tertiary">{stats?.totalSuggestions || 0}</p>
            )}
          </div>
        </div>
      </div>

      {/* Acceptance Rate */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-1">
        <div className="flex items-center">
          <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
            <svg className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3 sm:ml-4 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600">Acceptance Rate</p>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-6 sm:h-8 bg-gray-200 rounded w-12"></div>
              </div>
            ) : (
              <p className="text-xl sm:text-2xl font-bold text-tertiary">
                {stats ? formatAcceptanceRate(stats.acceptanceRate) : '0%'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
