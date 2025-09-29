// Blog post types
export interface BlogPost {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'review' | 'finalized' | 'published' | 'abandoned';
  version: number;
  createdAt: number;
  updatedAt: number;
}

// Suggestion types
export type SuggestionType = 'llm' | 'brand' | 'fact' | 'grammar' | 'spelling';
export type SuggestionPriority = 'low' | 'medium' | 'high';

export interface Suggestion {
  id: string;
  contentId: string;
  startOffset: number;
  endOffset: number;
  textToReplace: string;
  replaceWith: string;
  reason: string;
  priority: SuggestionPriority;
  type: SuggestionType;
  contextBefore: string;
  contextAfter: string;
  anchorText: string;
  createdAt: number;
}

// API response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// User authentication types
export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
