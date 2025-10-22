import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services';

export interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (postId: string) => void;
}

export const NewPostModal = ({
  isOpen,
  onClose,
  onPostCreated
}: NewPostModalProps) => {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-focus title input when modal opens and manage focus trap
  useEffect(() => {
    if (isOpen && titleInputRef.current) {
      titleInputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          if (!isSubmitting) {
            event.preventDefault();
            onClose();
          }
          break;
        case 'Tab':
          // Focus trap within modal
          if (modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
              'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0] as HTMLElement;
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

            if (event.shiftKey && document.activeElement === firstElement) {
              event.preventDefault();
              lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
              event.preventDefault();
              firstElement.focus();
            }
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSubmitting, onClose]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setValidationError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Real-time validation
  useEffect(() => {
    if (title.length === 0) {
      setValidationError(null); // Don't show error for empty field initially
    } else if (title.trim().length === 0) {
      setValidationError('Title cannot be empty');
    } else if (title.length > 200) {
      setValidationError('Title must be 200 characters or less');
    } else {
      setValidationError(null);
    }
  }, [title]);

  const validateTitle = (titleValue: string): string | null => {
    if (titleValue.length === 0) {
      return 'Title is required';
    }
    if (titleValue.trim().length === 0) {
      return 'Title cannot be empty';
    }
    if (titleValue.length > 200) {
      return 'Title must be 200 characters or less';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const error = validateTitle(title);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsSubmitting(true);
    try {
      const newPost = await apiService.createPost({
        title: title.trim(),
        body: ''
      });

      // Announce success to screen readers
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = 'Post created successfully. Navigating to editor.';
      document.body.appendChild(announcement);

      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);

      onPostCreated(newPost.id);
      onClose();
    } catch (error) {
      console.error('Failed to create post:', error);
      setValidationError('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  const isFormValid = title.trim().length > 0 && title.length <= 200 && !validationError;

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200">
          <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-gray-900">Create New Post</h2>
          <button
            onClick={handleCancel}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Close modal"
            type="button"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="p-3 sm:p-4">
            <div id="modal-description" className="sr-only">
              Enter a title for your new blog post. The title is required and must be between 1 and 200 characters.
            </div>
            <div>
              <label htmlFor="post-title" className="block text-sm font-medium text-gray-700 mb-1.5">
                Title <span className="text-red-500" aria-label="required">*</span>
              </label>
              <input
                ref={titleInputRef}
                id="post-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your post title"
                disabled={isSubmitting}
                required
                aria-required="true"
                aria-invalid={validationError ? 'true' : 'false'}
                aria-describedby={validationError ? 'title-error' : undefined}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                maxLength={200}
              />

              {validationError && (
                <p id="title-error" className="mt-1.5 text-sm text-red-600" role="alert" aria-live="polite">
                  {validationError}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-3 p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-2 sm:order-1"
              aria-describedby={isSubmitting ? 'cancel-disabled-help' : undefined}
            >
              Cancel
            </button>
            {isSubmitting && (
              <div id="cancel-disabled-help" className="sr-only">
                Cancel button is disabled while creating post
              </div>
            )}
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-hover border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-1 sm:order-2"
              aria-describedby={(!isFormValid && !isSubmitting) ? 'submit-disabled-help' : undefined}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div
                    className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"
                    aria-hidden="true"
                  ></div>
                  <span>Creating...</span>
                  <span className="sr-only">Please wait while your post is being created</span>
                </div>
              ) : (
                'Create Post'
              )}
            </button>
            {(!isFormValid && !isSubmitting) && (
              <div id="submit-disabled-help" className="sr-only">
                Create Post button is disabled. Please enter a valid title to continue.
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );

  // Render modal using portal to ensure it appears above all other content
  return createPortal(modalContent, document.body);
};
