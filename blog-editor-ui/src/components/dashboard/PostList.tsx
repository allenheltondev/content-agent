import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BlogPost } from '../../types';
import { apiService } from '../../services';
import { useAsyncOperation } from '../../hooks/useErrorHandling';
import { LoadingState } from '../common/LoadingState';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';
import { NewPostModal } from '../common/NewPostModal';
import { ARIA_LABELS, screenReader } from '../../utils/accessibility';

interface PostListProps {
  onCreatePost?: () => void;
}

export const PostList = ({ onCreatePost }: PostListProps) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isNewPostModalOpen, setIsNewPostModalOpen] = useState(false);
  const navigate = useNavigate();

  // Use async operation hook for loading posts
  const {
    loading: isLoading,
    error: loadError,
    execute: loadPosts,
    executeWithRetry: loadPostsWithRetry,
    clearError: clearLoadError
  } = useAsyncOperation<BlogPost[]>({
    context: 'Loading posts',
    showToast: true
  });

  // Load posts on component mount
  useEffect(() => {
    const fetchPosts = async () => {
      const fetchedPosts = await loadPostsWithRetry(() => apiService.getPosts(), 3);
      if (fetchedPosts) {
        setPosts(fetchedPosts);
      }
      // If fetchedPosts is null, the error is already handled by useAsyncOperation
      // and will be displayed via the loadError state
    };
    fetchPosts();
  }, []); // Empty dependency array - only run on mount

  const handleCreatePost = () => {
    try {
      // Open modal instead of direct navigation
      setIsNewPostModalOpen(true);

      // Announce to screen readers
      screenReader.announce('Opening new post creation modal', 'polite');

      // Call optional callback
      onCreatePost?.();
    } catch (error) {
      console.error('Failed to open modal:', error);
    }
  };

  const handleModalClose = () => {
    setIsNewPostModalOpen(false);
  };

  const handlePostCreated = (postId: string) => {
    try {
      // Navigate to editor with new post ID
      navigate(`/editor/${postId}`, { replace: false });

      // Close modal after successful creation and navigation
      setIsNewPostModalOpen(false);

      // Announce to screen readers for successful creation
      screenReader.announce('Post created successfully. Opening editor.', 'polite');
    } catch (error) {
      console.error('Navigation failed:', error);
      // Fallback navigation
      window.location.href = `/editor/${postId}`;
    }
  };

  const handleRetryLoad = async () => {
    clearLoadError();
    const fetchedPosts = await loadPosts(() => apiService.getPosts());
    if (fetchedPosts) {
      setPosts(fetchedPosts);
    }
  };

  const handlePostClick = (postId: string, postTitle?: string) => {
    try {
      navigate(`/editor/${postId}`, { replace: false });

      // Announce to screen readers
      const title = postTitle || 'Untitled Post';
      screenReader.announce(`Opening ${title} for editing`, 'polite');
    } catch (error) {
      console.error('Post navigation failed:', error);
      // Fallback navigation
      window.location.href = `/editor/${postId}`;
    }
  };

  const getStatusColor = (status: BlogPost['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200';
      case 'review':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-200';
      case 'finalized':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-200';
      case 'published':
        return 'bg-gradient-to-r from-primary/10 to-primary/20 text-primary border border-primary/20';
      case 'abandoned':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-200';
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <LoadingState
        message="Loading your blog posts..."
        size="md"
        className="py-12"
      />
    );
  }

  return (
    <AsyncErrorBoundary>
      <div className="space-y-4 sm:space-y-6">
        {/* Load Error Display */}
        {loadError && (
          <ErrorDisplay
            error={loadError}
            onRetry={handleRetryLoad}
            onDismiss={clearLoadError}
            variant="banner"
            className="mb-4"
          />
        )}


      {/* Header with Create New Post button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start lg:items-center gap-4 sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg flex-shrink-0">
              <svg className="h-5 w-5 sm:h-6 sm:w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold gradient-text-safe-secondary">
                Content Library
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                {posts.length === 0
                  ? 'Your content creation journey starts here'
                  : `${posts.length} ${posts.length === 1 ? 'post' : 'posts'} in your library`
                }
              </p>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCreatePost();
            }}
            aria-label={ARIA_LABELS.CREATE_POST}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-transparent text-sm font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:scale-105 min-h-touch"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Create New Post</span>
            <span className="sm:hidden">New Post</span>
          </button>
        </div>
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-full blur-3xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg border border-gray-100">
              <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl sm:rounded-2xl flex items-center justify-center mb-4 sm:mb-6">
                <svg className="h-6 w-6 sm:h-8 sm:w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-tertiary mb-2">Ready to Create?</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto">
                Your content library is empty, but that's about to change. Start your first post and let AI help you craft something amazing.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreatePost();
                }}
                aria-label={ARIA_LABELS.CREATE_POST}
                className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 border border-transparent shadow-lg text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl text-white bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 transform hover:scale-105 min-h-touch"
              >
                <svg className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Your First Post
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4" role="list" aria-label={ARIA_LABELS.POST_LIST}>
          {posts.map((post) => (
            <article
              key={post.id}
              className="group bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl shadow-md hover:shadow-xl border border-gray-100 hover:border-primary/20 transition-all duration-300 overflow-hidden"
              role="listitem"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePostClick(post.id, post.title);
                }}
                aria-label={`${ARIA_LABELS.EDIT_POST}: ${post.title || 'Untitled Post'}`}
                className="w-full text-left p-4 sm:p-6 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-transparent min-h-touch"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-3 sm:pr-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg lg:text-xl font-bold text-tertiary group-hover:text-primary transition-colors duration-200 line-clamp-2 sm:truncate">
                          {post.title || 'Untitled Post'}
                        </h3>
                        <div className="mt-1 sm:mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-gray-500">
                          <div className="flex items-center">
                            <svg className="flex-shrink-0 mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="truncate" aria-label={`${ARIA_LABELS.POST_LAST_UPDATED}: ${formatDate(post.updatedAt)}`}>
                              Updated {formatDate(post.updatedAt)}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <svg className="flex-shrink-0 mr-1 sm:mr-1.5 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Version {post.version}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 self-start">
                        <span
                          className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(post.status)}`}
                          aria-label={`${ARIA_LABELS.POST_STATUS}: ${post.status}`}
                        >
                          {post.status}
                        </span>
                      </div>
                    </div>
                    {post.body && (
                      <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 line-clamp-2">
                        {post.body.substring(0, 150)}
                        {post.body.length > 150 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 self-center ml-2 sm:ml-4">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-50 group-hover:bg-primary/10 rounded-full flex items-center justify-center transition-colors duration-200">
                      <svg className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 group-hover:text-primary transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            </article>
          ))}
        </div>
      )}

      {/* New Post Modal */}
      <NewPostModal
        isOpen={isNewPostModalOpen}
        onClose={handleModalClose}
        onPostCreated={handlePostCreated}
      />
      </div>
    </AsyncErrorBoundary>
  );
};
