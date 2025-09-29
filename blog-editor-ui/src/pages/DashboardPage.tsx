import { useAuth } from '../hooks';
import { useToastContext } from '../contexts/ToastContext';
import { PostList } from '../components/dashboard';
import { AsyncErrorBoundary } from '../components/common';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToastContext();

  const handleLogout = async () => {
    try {
      showSuccess('Signing out...');
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      showError('Failed to sign out. Please try again.');
    }
  };

  return (
    <AsyncErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 lg:px-8">
          {/* Header with logout */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">
                  Blog Editor Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Welcome back, {user?.attributes.name || user?.username}!
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Post management */}
          <PostList />
        </div>
      </div>
    </AsyncErrorBoundary>
  );
};
