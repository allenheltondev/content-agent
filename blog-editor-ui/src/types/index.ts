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

export interface SuggestionWithActions extends Suggestion {
  status: 'pending' | 'accepted' | 'rejected' | 'deleted' | 'skipped';
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onDelete: () => Promise<void>;
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
  summary?: string;
}

export interface SubmitReviewRequest {
  postId: string;
}

export interface FinalizeRequest {
  postId: string;
}

// Profile API request/response types
export interface CreateProfileRequest {
  writingTone: string;
  writingStyle: string;
  topics: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface UpdateProfileRequest {
  writingTone?: string;
  writingStyle?: string;
  topics?: string[];
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface ProfileResponse {
  profile: UserProfile;
}

export interface ProfileSetupResponse {
  success: boolean;
  profile: UserProfile;
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

// User profile types
export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  writingTone: string; // Freetext description of their tone (couple sentences)
  writingStyle: string; // Freetext description of their style (couple sentences)
  topics: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  isComplete: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

// Profile setup form state management
export interface ProfileSetupData {
  writingTone: string;
  writingStyle: string;
  topics: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  currentStep: number;
  isSubmitting: boolean;
  validationErrors: Record<string, string>;
}

// Authentication flow types
export type AuthFlowState = 'idle' | 'registering' | 'confirming' | 'authenticated';

// Authentication context types
export interface AuthContextType {
  user: CognitoUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Enhanced flow management
  authFlowState: AuthFlowState;
  pendingEmail: string | null;

  // Token refresh management
  lastTokenRefresh: number | null;

  // Methods with improved return types
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string>;
  register: (email: string, password: string, name: string) => Promise<{
    isSignUpComplete: boolean;
    nextStep?: any;
  }>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<{
    success: boolean;
    message: string;
    cooldownUntil?: number;
    attemptsRemaining?: number;
  }>;

  // New flow management methods
  resetAuthFlow: () => void;
  setPendingEmail: (email: string) => void;

  // Enhanced persistence methods
  persistAuthState: (user: CognitoUser, tokens: any) => void;
  restoreAuthState: () => { user: CognitoUser; tokens: any } | null;
  clearPersistedAuthState: () => void;

  // Enhanced error recovery methods
  handleAuthError: (error: unknown, operation: string) => AuthError;
  canRetryOperation: (error: AuthError) => boolean;
  getRetryDelay: (error: AuthError) => number;

  // Enhanced resend management methods
  getResendStatus: () => {
    canResend: boolean;
    cooldownRemaining: number;
    attemptsUsed: number;
    nextResendAt?: number;
  };
  shouldSuggestResend: () => boolean;
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

// Enhanced authentication error types
export type AuthErrorType = 'network' | 'validation' | 'cognito' | 'unknown';

export interface AuthError {
  type: AuthErrorType;
  code?: string;
  message: string;
  retryable: boolean;
  suggestedAction?: string;
  originalError?: Error;
}

export interface ErrorRecoveryStrategy {
  message: string;
  action: 'redirect-to-login' | 'retry-confirmation' | 'auto-resend' | 'retry-operation' | 'contact-support';
  showResendOption?: boolean;
  retryDelay?: number;
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

// Logo component types
export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

// InfoBox component types
export interface InfoBoxProps {
  id: string; // Unique identifier for persistence
  title: string;
  content: string | ReactNode;
  type?: 'info' | 'tip' | 'warning';
  onDismiss?: () => void;
  className?: string;
}

export interface DismissedInfoBoxes {
  [boxId: string]: {
    dismissedAt: string; // ISO timestamp
    version: string; // App version when dismissed
  };
}

// Statistics types
export interface StatsResponse {
  totalPosts: number;
  totalSuggestions: number;
  acceptedSuggestions: number;
  rejectedSuggestions: number;
  skippedSuggestions: number;
  deletedSuggestions: number;
  acceptanceRate: number;
  suggestionsByType: {
    [key in SuggestionType]: {
      total: number;
      accepted: number;
      rejected: number;
    };
  };
  insights: WritingInsight[];
  writingPatterns: {
    averagePostLength: number;
    commonTopics: string[];
    writingTrends: string;
  };
}

export interface WritingInsight {
  type: 'strength' | 'improvement' | 'observation';
  category: 'writing_style' | 'grammar' | 'content' | 'structure';
  message: string;
  confidence: number;
}

export interface TenantStats {
  totalPosts: number;
  totalSuggestions: number;
  acceptanceRate: number;
}

// Review system types
export interface ReviewSession {
  reviewId: string;
  tenantId: string;
  contentId: string;
  status: 'pending' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  token: string;
  endpoint: string;
  expiresAt: number;
  // Backward compatibility fields (deprecated)
  momentoToken?: string;
  topicName?: string;
}

export interface StartReviewResponse {
  reviewId: string;
  token: string; // Simplified from momentoToken
  endpoint: string; // Simplified from topicName
  expiresAt: number;
}

export interface ReviewCompleteMessage {
  type: 'review_complete';
  reviewId: string;
  contentId: string;
  success: boolean;
  completedAt: number;
  error?: string;
}

export interface ReviewErrorMessage {
  type: 'review_error';
  reviewId: string;
  contentId: string;
  error: string;
  failedAt: number;
  retryable: boolean;
}

export type ReviewMessage = ReviewCompleteMessage | ReviewErrorMessage;

export interface ReviewNotification {
  id: string;
  type: 'success' | 'error' | 'loading';
  message: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export interface ReviewServiceConfig {
  baseUrl: string;
  getAuthToken: () => Promise<string>;
  pollingInterval?: number;
  maxRetries?: number;
}
