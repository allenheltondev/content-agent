import { useAuth } from '../hooks';
import { useToastContext } from '../contexts/ToastContext';
import { PostList } from '../components/dashboard';
import { AsyncErrorBoundary, Logo, InfoBox } from '../components/common';
import { usePageTitle } from '../hooks/usePageTitle';
import { useInfoBoxManager } from '../hooks/useInfoBoxManager';

export const DashboardPage = () => {
  const { user, logout } = useAuth();
  const { showSuccess, showError } = useToastContext();
  const { isDismissed, dismissInfoBox } = useInfoBoxManager();

  // Set page title
  usePageTitle('Home');

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
                <div className="flex items-center mb-2">
                  <Logo size="md" showText={true} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-tertiary truncate">
                  Betterer Dashboard
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Welcome back, {user?.attributes.name || user?.username}!
                </p>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleLogout}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
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

          {/* Welcome info box */}
          {!isDismissed('dashboard-welcome') && (
            <InfoBox
              id="dashboard-welcome"
              type="info"
              title="Welcome to Betterer!"
              content={
                <div className="space-y-2">
                  <p>Here's how to get started with your blog posts:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><strong>Create a new post</strong> - Click "New Post" to start writing</li>
                    <li><strong>Edit drafts</strong> - Click on any draft to continue editing</li>
                    <li><strong>Get AI suggestions</strong> - Submit posts for review to receive intelligent feedback</li>
                    <li><strong>Track progress</strong> - Monitor your posts through draft, review, and finalized stages</li>
                  </ul>
                  <p className="text-sm text-gray-600 mt-2">
                    Betterer helps make your words... well, betterer! 🚀
                  </p>
                </div>
              }
              onDismiss={() => dismissInfoBox('dashboard-welcome')}
              className="mb-6"
            />
          )}

          {/* Post management */}
          <PostList />
        </div>
      </div>
    </AsyncErrorBoundary>
  );
};
