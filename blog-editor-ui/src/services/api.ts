import type { BlogPost, Suggestion, ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Blog post endpoints
  async getPosts(): Promise<ApiResponse<BlogPost[]>> {
    return this.request<BlogPost[]>('/posts');
  }

  async getPost(id: string): Promise<ApiResponse<BlogPost>> {
    return this.request<BlogPost>(`/posts/${id}`);
  }

  async createPost(post: Partial<BlogPost>): Promise<ApiResponse<BlogPost>> {
    return this.request<BlogPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    });
  }

  async updatePost(
    id: string,
    post: Partial<BlogPost>
  ): Promise<ApiResponse<BlogPost>> {
    return this.request<BlogPost>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(post),
    });
  }

  // Suggestion endpoints
  async getSuggestions(postId: string): Promise<ApiResponse<Suggestion[]>> {
    return this.request<Suggestion[]>(`/posts/${postId}/suggestions`);
  }

  async deleteSuggestion(suggestionId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/suggestions/${suggestionId}`, {
      method: 'DELETE',
    });
  }

  // Post workflow endpoints
  async submitForReview(postId: string): Promise<ApiResponse<BlogPost>> {
    return this.request<BlogPost>(`/posts/${postId}/submit-review`, {
      method: 'POST',
    });
  }

  async finalizePost(postId: string): Promise<ApiResponse<BlogPost>> {
    return this.request<BlogPost>(`/posts/${postId}/finalize`, {
      method: 'POST',
    });
  }
}

export const apiService = new ApiService();
