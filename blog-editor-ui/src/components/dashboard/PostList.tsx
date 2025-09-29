import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { BlogPost } from '../../types';
import { apiService } from '../../services/ApiService';
import { useToastContext } from '../../contexts/ToastContext';
import { useAsyncOperation } from '../../hooks/useErrorHandling';
import { LoadingState, ButtonLoading } from '../common/LoadingState';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';

interface PostListProps {
  onCreatePost?: () => void;
}

export const PostList = ({ onCreatePost }: PostListProps) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const navigate = useNavigate();
  const { showSuccess } = useToastContext();

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

  // Use async operation hook for creating posts
  const {
    loading: isCreating,
    error: createError,
    execute: createPost,
    clearError: clearCreateError
  } = useAsyncOperation<BlogPost>({
    context: 'Creating post',
    showToast: true
  });

  // Load posts on component mount
  useEffect(() => {
    const fetchPosts = async () => {
      const fetchedPosts = await loadPostsWithRetry(() => apiService.getPosts(), 3);
      if (fetchedPosts) {
        setPosts(fetchedPosts);
      }
    };
    fetchPosts();
  }, [loadPostsWithRetry]);

  const handleCreatePost = async () => {
    const newPost = await createPost(() => apiService.createPost({
      title: 'Untitled Post',
      body: ''
    }));

    if (newPost) {
      showSuccess('New post created successfully!');

      // Add the new post to the list
      setPosts(prevPosts => [newPost, ...prevPosts]);

      // Navigate to editor for the new post
      navigate(`/editor/${newPost.id}`);

      // Call optional callback
      onCreatePost?.();
    }
  };

  const handleRetryLoad = async () => {
    clearLoadError();
    const fetchedPosts = await loadPosts(() => apiService.getPosts());
    if (fetchedPosts) {
      setPosts(fetchedPosts);
    }
  };

  const handlePostClick = (postId: string) => {
    navigate(`/editor/${postId}`);
  };

  const getStatusColor = (status: BlogPost['status']) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'finalized':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'abandoned':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

        {/* Create Error Display */}
        {createError && (
          <ErrorDisplay
            error={createError}
            onDismiss={clearCreateError}
            variant="inline"
            className="mb-4"
          />
        )}
      {/* Header with Create New Post button */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Your Blog Posts</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {posts.length === 0
              ? 'No posts yet. Create your first blog post to get started!'
              : `${posts.length} post${posts.length === 1 ? '' : 's'}`
            }
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={handleCreatePost}
            disabled={isCreating}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? (
              <ButtonLoading message="Creating..." />
            ) : (
              <>
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Create New Post</span>
                <span className="sm:hidden">New Post</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No blog posts</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating your first blog post.</p>
          <div className="mt-6">
            <button
              onClick={handleCreatePost}
              disabled={isCreating}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <ButtonLoading message="Creating..." />
              ) : (
                <>
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create New Post
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {posts.map((post) => (
              <li key={post.id}>
                <button
                  onClick={() => handlePostClick(post.id)}
                  className="w-full text-left block hover:bg-gray-50 px-4 py-4 sm:px-6 transition-colors focus:outline-none focus:bg-gray-50"
                >
                  <div className="flex items-start sm:items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                        <p className="text-base sm:text-lg font-medium text-gray-900 truncate">
                          {post.title || 'Untitled Post'}
                        </p>
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                            {post.status}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-col sm:flex-row sm:items-center text-xs sm:text-sm text-gray-500 gap-1 sm:gap-0">
                        <div className="flex items-center">
                          <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Updated {formatDate(post.updatedAt)}</span>
                        </div>
                        <span className="hidden sm:inline mx-2">•</span>
                        <div className="flex items-center">
                          <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Version {post.version}</span>
                        </div>
                      </div>
                      {post.body && (
                        <p className="mt-2 text-xs sm:text-sm text-gray-600 overflow-hidden">
                          <span className="block truncate">
                            {post.body.substring(0, window.innerWidth < 640 ? 100 : 150)}
                            {post.body.length > (window.innerWidth < 640 ? 100 : 150) ? '...' : ''}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 self-center">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      </div>
    </AsyncErrorBoundary>
  );
};
