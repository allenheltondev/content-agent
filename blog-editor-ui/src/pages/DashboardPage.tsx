import { useAuth } from '../hooks';
import { PostList } from '../components/dashboard';
import { AsyncErrorBoundary, InfoBox, AppHeader } from '../components/common';
import { usePageTitle } from '../hooks/usePageTitle';
import { useInfoBoxManager } from '../hooks/useInfoBoxManager';
import { extractFirstName } from '../utils';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { isDismissed, dismissInfoBox } = useInfoBoxManager();

  // Extract first name for personalized welcome message
  const firstName = extractFirstName(user?.attributes.name);
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
              <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center">
                    <div className="p-2 sm:p-3 bg-primary/10 rounded-lg flex-shrink-0">
                      <svg className="h-5 w-5 sm:h-6 sm:w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Total Posts</p>
                      <p className="text-xl sm:text-2xl font-bold text-tertiary">--</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center">
                    <div className="p-2 sm:p-3 bg-secondary/10 rounded-lg flex-shrink-0">
                      <svg className="h-5 w-5 sm:h-6 sm:w-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">AI Suggestions</p>
                      <p className="text-xl sm:text-2xl font-bold text-tertiary">--</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 sm:col-span-2 lg:col-span-1">
                  <div className="flex items-center">
                    <div className="p-2 sm:p-3 bg-green-100 rounded-lg flex-shrink-0">
                      <svg className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-600">Published</p>
                      <p className="text-xl sm:text-2xl font-bold text-tertiary">--</p>
                    </div>
                  </div>
                </div>
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
