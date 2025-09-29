import type { ReactNode } from 'react';

// Blog post types
export interface BlogPost {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'review' | 'finalized' | 'published' | 'abandoned';
  version: number;
  createdAt: number;
  updatedAt: number;
  authorId: string;
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

// API request/response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CreatePostRequest {
  title: string;
  body: string;
}

export interface UpdatePostRequest {
  title?: string;
  body?: string;
  status?: BlogPost['status'];
}

export interface PostListResponse {
  posts: BlogPost[];
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

export interface SubmitReviewRequest {
  postId: string;
}

export interface FinalizeRequest {
  postId: string;
}

// Amazon Cognito user types
export interface CognitoUser {
  username: string;
  attributes: {
    email: string;
    sub: string;
    name?: string;
  };
}

// Authentication context types
export interface AuthContextType {
  user: CognitoUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
}

// Legacy User interface for backward compatibility
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
// Editor state types
export interface EditorState {
  post: BlogPost | null;
  content: string;
  suggestions: Suggestion[];
  selectedSuggestion: string | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
}

// Component prop types
export interface ContentEditorProps {
  post: BlogPost;
  onSave: (post: BlogPost) => void;
}

export interface SuggestionOverlayProps {
  suggestions: Suggestion[];
  content: string;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export interface AuthProviderProps {
  children: ReactNode;
}

// API service types
export interface ApiServiceConfig {
  baseUrl: string;
  getAuthToken: () => Promise<string>;
}

// Error types
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Local storage types
export interface DraftContent {
  postId: string;
  content: string;
  lastSaved: number;
}

export interface EditorPreferences {
  autoSaveInterval: number;
  showSuggestionTypes: SuggestionType[];
  theme: 'light' | 'dark';
}

// Toast notification types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Route types
export interface ProtectedRouteProps {
  children: ReactNode;
}
