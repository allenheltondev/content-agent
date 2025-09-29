import { useEffect, useState } from 'react';
import { ApiService } from '../services/ApiService';
import { useApi, useApiMutation } from '../hooks/useApi';
import type { BlogPost, CreatePostRequest } from '../types';

/**
 * Example component demonstrating how to use the ApiService
 * This is for reference and testing purposes
 */
export function ApiServiceExample() {
  const [apiService, setApiService] = useState<ApiService | null>(null);

  // Hook for fetching posts
  const { data: posts, loading: postsLoading, error: postsError, execute: fetchPosts } = useApi<BlogPost[]>();

  // Hook for creating posts
  const { loading: createLoading, error: createError, mutate: createPost } = useApiMutation<BlogPost>();

  // Initialize API service (in a real app, this would be done at the app level)
  useEffect(() => {
    const mockGetAuthToken = async () => {
      // In a real app, this would get the token from Cognito
      return 'mock-jwt-token';
    };

    const service = new ApiService({
      baseUrl: 'https://api.example.com',
      getAuthToken: mockGetAuthToken
    });

    setApiService(service);
  }, []);

  // Fetch posts when API service is ready
  useEffect(() => {
    if (apiService) {
      fetchPosts(() => apiService.getPosts(), {
        logContext: 'Fetching posts'
      });
    }
  }, [apiService, fetchPosts]);

  const handleCreatePost = async () => {
    if (!apiService) return;

    const newPost: CreatePostRequest = {
      title: 'New Post',
      body: 'This is a new post created via the API service.'
    };

    const result = await createPost(
      () => apiService.createPost(newPost),
      {
        logContext: 'Creating post',
        onSuccess: (createdPost) => {
          console.log('Post created successfully:', createdPost);
          // Refresh the posts list
          fetchPosts(() => apiService.getPosts());
        }
      }
    );

    if (result) {
      console.log('Created post:', result);
    }
  };

  if (!apiService) {
    return <div>Initializing API service...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Service Example</h1>

      {/* Posts List Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Blog Posts</h2>

        {postsLoading && (
          <div className="text-blue-600">Loading posts...</div>
        )}

        {postsError && (
          <div className="text-red-600 bg-red-50 p-3 rounded">
            Error: {postsError}
          </div>
        )}

        {posts && posts.length > 0 && (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border p-4 rounded-lg">
                <h3 className="font-semibold">{post.title}</h3>
                <p className="text-gray-600 mt-2">{post.body.substring(0, 100)}...</p>
                <div className="text-sm text-gray-500 mt-2">
                  Status: {post.status} | Version: {post.version}
                </div>
              </div>
            ))}
          </div>
        )}

        {posts && posts.length === 0 && (
          <div className="text-gray-500">No posts found.</div>
        )}
      </div>

      {/* Create Post Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Post</h2>

        <button
          onClick={handleCreatePost}
          disabled={createLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {createLoading ? 'Creating...' : 'Create Sample Post'}
        </button>

        {createError && (
          <div className="text-red-600 bg-red-50 p-3 rounded mt-4">
            Error creating post: {createError}
          </div>
        )}
      </div>

      {/* API Service Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">API Service Features</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>✅ JWT token injection for authenticated requests</li>
          <li>✅ Automatic retry logic with exponential backoff</li>
          <li>✅ Comprehensive error handling and user-friendly messages</li>
          <li>✅ Request cancellation support via AbortController</li>
          <li>✅ TypeScript interfaces for type safety</li>
          <li>✅ React hooks for easy integration</li>
        </ul>
      </div>
    </div>
  );
}

export default ApiServiceExample;
