import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { useApiMutation } from '../../hooks/useApi';
import { apiService } from '../../services/ApiService';
import { useToast } from '../../hooks/useToast';
import type { BlogPost, CreatePostRequest } from '../../types';
import { AsyncErrorBoundary } from '../common/AsyncErrorBoundary';
import { EditorFallbackUI } from './EditorFallbackUI';
import { ErrorReportingManager } from '../../utils/errorReporting';

interface SubmitButtonProps {
  postId: string | null;
  title: string;
  content: string;
  isAutoSaving: boolean;
  onSubmit?: () => void | Promise<void>;
  onPostCreated?: (postId: string) => void;
  onSuccess?: () => void;
  disabled?: boolean;
  className?: string;
  post?: BlogPost | null;
  redirectToDashboard?: boolean;
  hasUnsavedChanges?: boolean;
  forceSave?: () => Promise<void>;
}

export const SubmitButton = ({
  postId,
  title,
  content,
  isAutoSaving,
  onSubmit,
  onPostCreated,
  onSuccess,
  disabled = false,
  className = '',
  post = null,
  redirectToDashboard = false,
  hasUnsavedChanges = false,
  forceSave
}: SubmitButtonProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutate } = useApiMutation<BlogPost>();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  // Validate post data before submission
  const validatePostData = (): { isValid: boolean; error?: string } => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle && !trimmedContent) {
      return { isValid: false, error: 'Please add a title and content before submitting for review' };
    }

    if (!trimmedTitle) {
      return { isValid: false, error: 'Please add a title before submitting for review' };
    }

    if (!trimmedContent) {
      return { isValid: false, error: 'Please add content before submitting for review' };
    }

    if (trimmedTitle.length > 200) {
      return { isValid: false, error: 'Title must be 200 characters or less' };
    }

    return { isValid: true };
  };

  // Create post when ID is missing
  const createPostIfNeeded = async (): Promise<string> => {
    if (postId) {
      return postId;
    }

    const createRequest: CreatePostRequest = {
      title: title.trim(),
      body: content.trim()
    };

    const newPost = await mutate(
      (signal) => apiService.createPost(createRequest, signal),
      {
        onError: (error) => {
          throw new Error(`Failed to create post: ${error.message}`);
        },
        logContext: 'submit-button-create'
      }
    );

    if (!newPost) {
      throw new Error('Failed to create post');
    }

    onPostCreated?.(newPost.id);
    return newPost.id;
  };

  // Submit for review
  const submitForReview = async (currentPostId: string): Promise<void> => {
    await mutate(
      (signal) => apiService.submitForReview(currentPostId, signal),
      {
        onError: (error) => {
          throw new Error(`Failed to submit for review: ${error.message}`);
        },
        logContext: 'submit-button-review'
      }
    );
  };

  // Handle submit button click
  const handleSubmit = async () => {
    if (isSubmitting || isAutoSaving) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Check if post is already under review
      if (post?.status === 'review') {
        showError('This post is already under review');
        return;
      }

      // Validate post data
      const validation = validatePostData();
      if (!validation.isValid) {
        showError(validation.error!);
        return;
      }

      // Ensure data consistency by saving any unsaved changes
      if (hasUnsavedChanges && forceSave) {
        try {
          await forceSave();
        } catch (saveError) {
          console.error('Failed to save before submit:', saveError);
          showError('Failed to save changes before submitting. Please try again.');
          return;
        }
      }

      // Wait for auto-save to complete if still in progress
      if (isAutoSaving) {
        showError('Please wait for auto-save to complete before submitting');
        return;
      }

      // Use custom submit handler if provided
      if (onSubmit) {
        const result = onSubmit();

        // Handle both sync and async handlers
        if (result instanceof Promise) {
          await result;
        }

        // Don't show success message here - let the custom handler manage that
        onSuccess?.();
        return;
      }

      // Default submit logic
      // 1. Create post if ID is missing
      const currentPostId = await createPostIfNeeded();

      // 2. Submit for review
      await submitForReview(currentPostId);

      // 3. Show success message
      showSuccess('Post submitted for review successfully! You\'ll receive writing improvements shortly.');

      // 4. Redirect to dashboard if requested
      if (redirectToDashboard) {
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500); // Give user time to see success message
      }

      // 5. Call success callback
      onSuccess?.();

    } catch (error) {
      console.error('Submit failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit for review';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine if button should be disabled
  const isDisabled = disabled || isSubmitting || isAutoSaving || post?.status === 'review';

  // Get button text based on state
  const getButtonText = () => {
    if (isSubmitting) {
      return 'Submitting...';
    }
    if (isAutoSaving) {
      return 'Saving...';
    }
    if (post?.status === 'review') {
      return 'Under Review';
    }
    return 'Submit for Review';
  };

  // Get button title/tooltip
  const getButtonTitle = () => {
    if (isSubmitting) {
      return 'Submitting post for review...';
    }
    if (isAutoSaving) {
      return 'Please wait for auto-save to complete';
    }
    if (post?.status === 'review') {
      return 'This post is already under review';
    }
    if (disabled) {
      return 'Submit button is disabled';
    }
    return 'Submit this post for AI review and get intelligent suggestions';
  };

  return (
    <AsyncErrorBoundary
      onError={(error, errorInfo) => {
        ErrorReportingManager.reportEditorError(
          error,
          postId,
          'SubmitButton',
          Boolean(title.trim() || content.trim()),
          { errorInfo, postStatus: post?.status }
        );
      }}
      fallback={(error, retry) => (
        <EditorFallbackUI
          error={error}
          onRetry={retry}
          componentName="Submit Button"
          postId={postId}
          title={title}
          content={content}
        />
      )}
    >
      <button
      onClick={handleSubmit}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      title={getButtonTitle()}
    >
      <PaperAirplaneIcon className="h-4 w-4 mr-2" />
      {getButtonText()}
      </button>
    </AsyncErrorBoundary>
  );
};
