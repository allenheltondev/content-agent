import { useAuth } from '../hooks';
import { PostList, StatsOverview } from '../components/dashboard';
import { AsyncErrorBoundary, InfoBox, AppHeader } from '../components/common';
import { usePageTitle } from '../hooks/usePageTitle';
import { useInfoBoxManager } from '../hooks/useInfoBoxManager';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { isDismissed, dismissInfoBox } = useInfoBoxManager();

  // Extract first name for personalized welcome message
  const firstName = user?.attributes.name?.trim()
    ? user.attributes.name.trim().split(/\s+/)[0] || ''
    : '';
  const welcomeMessage = firstName
    ? `Welcome back, ${firstName}!`
    : 'Welcome back!';

  // Set page title
  usePageTitle('Home');

  return (
    <AsyncErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
        {/* Professional App Header */}
        <AppHeader />

        {/* Main Content */}
        <main id="main-content" tabIndex={-1}>

        {/* Hero Section with Professional Styling */}
        <div className="relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(33,158,255,0.1),transparent_50%)]"></div>

          <div className="relative max-w-7xl mx-auto py-6 sm:py-8 lg:py-12 px-3 sm:px-4 lg:px-6 xl:px-8">
            {/* Welcome section with enhanced styling */}
            <div className="mb-6 sm:mb-8 lg:mb-12">
              <div className="text-center sm:text-left">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold gradient-text-safe">
                  {welcomeMessage}
                </h1>
                <p className="text-base sm:text-lg lg:text-xl text-gray-600 mt-2 sm:mt-3 max-w-2xl">
                  Transform your ideas into compelling content with AI-powered writing assistance
                </p>
              </div>

              {/* Quick Stats Cards */}
              <div className="mt-6 sm:mt-8">
                <StatsOverview />
              </div>
            </div>

            {/* Welcome info box with enhanced styling */}
            {!isDismissed('dashboard-welcome') && (
              <InfoBox
                id="dashboard-welcome"
                type="info"
                title="Welcome to Your Writing Studio!"
                content={
                  <div className="space-y-3">
                    <p className="text-gray-700 text-sm sm:text-base">Here's how to get started with your content creation journey:</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mt-4">
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-primary text-xs sm:text-sm font-bold">1</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Create New Content</p>
                          <p className="text-xs sm:text-sm text-gray-600">Start with a blank canvas and let your creativity flow</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-secondary/10 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-secondary text-xs sm:text-sm font-bold">2</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Get AI Assistance</p>
                          <p className="text-xs sm:text-sm text-gray-600">Receive intelligent suggestions to enhance your writing</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-green-600 text-xs sm:text-sm font-bold">3</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Track Progress</p>
                          <p className="text-xs sm:text-sm text-gray-600">Monitor your posts from draft to publication</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-2 sm:space-x-3">
                        <div className="flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                          <span className="text-purple-600 text-xs sm:text-sm font-bold">4</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm sm:text-base">Publish & Share</p>
                          <p className="text-xs sm:text-sm text-gray-600">Share your polished content with the world</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 p-3 sm:p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/10">
                      <p className="text-xs sm:text-sm text-gray-700 font-medium">
                        ✨ Your AI writing assistant is ready to help you create better content, faster.
                      </p>
                    </div>
                  </div>
                }
                onDismiss={() => dismissInfoBox('dashboard-welcome')}
                className="mb-6 sm:mb-8"
              />
            )}
          </div>
        </div>

        {/* Main Content Section */}
        <div className="relative">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 pb-8 sm:pb-12">
            {/* Content Management Section */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <div className="p-4 sm:p-6 lg:p-8">
                <PostList />
              </div>
            </div>
          </div>
        </div>
        </main>
      </div>
    </AsyncErrorBoundary>
  );
};
