import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../hooks/useToast';
import { useProfile } from '../hooks/useProfile';
import { useProfileContext } from '../contexts/ProfileContext';
import { AppHeader } from '../components/common';
import { ProfileErrorBoundary, ProfileErrorDisplay, ProfileOperationLoading } from '../components/profile';
import type { UpdateProfileRequest } from '../types';

// Predefined topic options (same as ProfileSetupPage)
const PREDEFINED_TOPICS = [
  'Technology',
  'Business',
  'Lifestyle',
  'Education',
  'Health & Wellness',
  'Travel',
  'Food & Cooking',
  'Finance',
  'Marketing',
  'Personal Development',
  'Science',
  'Entertainment',
  'Sports',
  'Politics',
  'Environment'
];

// Skill level options with encouraging descriptions (same as ProfileSetupPage)
const SKILL_LEVELS = [
  {
    value: 'beginner' as const,
    label: 'Just Getting Started',
    description: 'New to writing or blogging - excited to learn and improve!'
  },
  {
    value: 'intermediate' as const,
    label: 'Building Confidence',
    description: 'Have some writing experience and ready to take it to the next level'
  },
  {
    value: 'advanced' as const,
    label: 'Experienced Writer',
    description: 'Comfortable with writing and looking to refine your craft'
  },
  {
    value: 'expert' as const,
    label: 'Seasoned Professional',
    description: 'Extensive writing experience and helping others improve'
  }
];

interface ProfileFormData {
  writingTone: string;
  writingStyle: string;
  topics: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  isLoading: boolean;
  isSaving: boolean;
  validationErrors: Record<string, string>;
}

const ProfilePageContent = () => {
  const { profile, refreshProfile } = useProfile();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const {
    updateProfile,
    isLoading,
    error,
    clearError,
    retryLastOperation,
    canRetry,
    retryCount,
    isCheckingProfile
  } = useProfileContext();

  // Set page title
  usePageTitle('Profile Settings');

  // Form state
  const [formData, setFormData] = useState<ProfileFormData>({
    writingTone: '',
    writingStyle: '',
    topics: [],
    skillLevel: 'beginner',
    isLoading: true,
    isSaving: false,
    validationErrors: {}
  });

  // Custom topic input
  const [customTopic, setCustomTopic] = useState('');
  const [showCustomTopicInput, setShowCustomTopicInput] = useState(false);

  // Track if form has been modified
  const [isDirty, setIsDirty] = useState(false);

  // Load profile data on component mount
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        writingTone: profile.writingTone || '',
        writingStyle: profile.writingStyle || '',
        topics: profile.topics || [],
        skillLevel: profile.skillLevel || 'beginner',
        isLoading: false
      }));
    } else if (!isCheckingProfile) {
      // Profile is null and we're not checking - this might be an error state
      setFormData(prev => ({ ...prev, isLoading: false }));
    }
  }, [profile, isCheckingProfile]);

  // Validation functions
  const validateForm = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!formData.writingTone.trim()) {
      errors.writingTone = 'Please describe your writing tone';
    } else if (formData.writingTone.trim().length < 10) {
      errors.writingTone = 'Please provide a more detailed description (at least 10 characters)';
    }

    if (!formData.writingStyle.trim()) {
      errors.writingStyle = 'Please describe your writing style';
    } else if (formData.writingStyle.trim().length < 10) {
      errors.writingStyle = 'Please provide a more detailed description (at least 10 characters)';
    }

    if (formData.topics.length === 0) {
      errors.topics = 'Please select at least one topic you write about';
    }

    return errors;
  };

  // Handle input changes
  const handleInputChange = (field: keyof ProfileFormData, value: any) => {
    const newValidationErrors = { ...formData.validationErrors };
    delete newValidationErrors[field as string]; // Remove error when user starts typing

    setFormData(prev => ({
      ...prev,
      [field]: value,
      validationErrors: newValidationErrors
    }));

    setIsDirty(true);
  };

  // Handle topic selection
  const handleTopicToggle = (topic: string) => {
    const currentTopics = formData.topics;
    const isSelected = currentTopics.includes(topic);

    const newTopics = isSelected
      ? currentTopics.filter(t => t !== topic)
      : [...currentTopics, topic];

    handleInputChange('topics', newTopics);
  };

  // Handle custom topic addition
  const handleAddCustomTopic = () => {
    const topic = customTopic.trim();
    if (topic && !formData.topics.includes(topic)) {
      handleInputChange('topics', [...formData.topics, topic]);
      setCustomTopic('');
      setShowCustomTopicInput(false);
    }
  };

  // Handle custom topic removal
  const handleRemoveCustomTopic = (topic: string) => {
    if (!PREDEFINED_TOPICS.includes(topic)) {
      handleInputChange('topics', formData.topics.filter(t => t !== topic));
    }
  };

  // Handle form submission
  const handleSave = async () => {
    const errors = validateForm();

    if (Object.keys(errors).length > 0) {
      setFormData(prev => ({
        ...prev,
        validationErrors: errors
      }));
      showError('Please fix the errors below');
      return;
    }

    // Clear any previous errors
    clearError();

    try {
      const updateData: UpdateProfileRequest = {
        writingTone: formData.writingTone.trim(),
        writingStyle: formData.writingStyle.trim(),
        topics: formData.topics,
        skillLevel: formData.skillLevel
      };

      await updateProfile(updateData);

      // Refresh profile in auth context
      await refreshProfile();

      setIsDirty(false);
      showSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update failed:', error);
      // Error is now handled by ProfileContext and displayed via ProfileErrorDisplay
    }
  };

  // Handle retry from error display
  const handleRetry = async () => {
    if (canRetry) {
      await retryLastOperation();
    }
  };

  // Handle cancel - navigate back to dashboard
  const handleCancel = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave without saving?'
      );
      if (!confirmLeave) {
        return;
      }
    }
    navigate('/dashboard');
  };

  // Loading state
  if (formData.isLoading || isCheckingProfile) {
    return <ProfileOperationLoading operation="loading" variant="page" />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional App Header */}
      <AppHeader />

      <div className="py-6 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-tertiary">Profile Settings</h1>
              <p className="mt-2 text-sm sm:text-base text-gray-600">
                Update your writing preferences to get better writing improvements
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex-shrink-0"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-6">
            <ProfileErrorDisplay
              error={error}
              onRetry={handleRetry}
              onDismiss={clearError}
              context="edit"
              variant="card"
              showRetryCount={true}
              retryCount={retryCount}
              maxRetries={3}
            />
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow rounded-lg sm:rounded-lg">
          <div className="px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
            <div className="space-y-6 sm:space-y-8">
              {/* Writing Tone Section */}
              <div>
                <h3 className="text-lg font-medium text-tertiary mb-4">Writing Tone</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Describe how you like to communicate with your readers. Are you formal, casual, friendly, professional, humorous?
                </p>
                <textarea
                  id="writingTone"
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                    formData.validationErrors.writingTone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="For example: I like to write in a friendly, conversational tone that makes complex topics feel approachable. I use humor when appropriate and always aim to connect with my readers on a personal level."
                  value={formData.writingTone}
                  onChange={(e) => handleInputChange('writingTone', e.target.value)}
                />
                {formData.validationErrors.writingTone && (
                  <p className="mt-1 text-sm text-red-600">{formData.validationErrors.writingTone}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  This helps our AI understand your voice and provide suggestions that match your style.
                </p>
              </div>

              {/* Writing Style Section */}
              <div>
                <h3 className="text-lg font-medium text-tertiary mb-4">Writing Style</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Tell us about your approach to writing. Do you prefer short paragraphs, detailed explanations, storytelling, data-driven content?
                </p>
                <textarea
                  id="writingStyle"
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                    formData.validationErrors.writingStyle ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="For example: I prefer to write in short, digestible paragraphs with clear headings. I like to start with a story or example, then dive into the details. I use bullet points and numbered lists to make information easy to scan."
                  value={formData.writingStyle}
                  onChange={(e) => handleInputChange('writingStyle', e.target.value)}
                />
                {formData.validationErrors.writingStyle && (
                  <p className="mt-1 text-sm text-red-600">{formData.validationErrors.writingStyle}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  This helps us suggest improvements that align with your preferred writing approach.
                </p>
              </div>

              {/* Topics Section */}
              <div>
                <h3 className="text-lg font-medium text-tertiary mb-4">Topics You Write About</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select the topics you're passionate about. This helps us provide more relevant suggestions and examples.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
                  {PREDEFINED_TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleTopicToggle(topic)}
                      className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                        formData.topics.includes(topic)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>

                {/* Custom topic input */}
                {showCustomTopicInput ? (
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Enter custom topic"
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomTopic();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTopic}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomTopicInput(false);
                        setCustomTopic('');
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCustomTopicInput(true)}
                    className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-primary hover:text-primary transition-colors"
                  >
                    + Add Custom Topic
                  </button>
                )}

                {/* Selected topics with custom topic removal */}
                {formData.topics.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-tertiary mb-2">Selected Topics:</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.topics.map((topic) => (
                        <span
                          key={topic}
                          className="inline-flex items-center px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                        >
                          {topic}
                          {!PREDEFINED_TOPICS.includes(topic) && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCustomTopic(topic)}
                              className="ml-2 text-primary hover:text-primary-hover"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {formData.validationErrors.topics && (
                  <p className="mt-1 text-sm text-red-600">{formData.validationErrors.topics}</p>
                )}
              </div>

              {/* Skill Level Section */}
              <div>
                <h3 className="text-lg font-medium text-tertiary mb-4">Writing Experience</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This helps us tailor our suggestions to your experience level. Remember, every expert was once a beginner!
                </p>

                <div className="space-y-4">
                  {SKILL_LEVELS.map((level) => (
                    <label
                      key={level.value}
                      className={`block p-4 border rounded-lg cursor-pointer transition-colors ${
                        formData.skillLevel === level.value
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-300 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start">
                        <input
                          type="radio"
                          name="skillLevel"
                          value={level.value}
                          checked={formData.skillLevel === level.value}
                          onChange={(e) => handleInputChange('skillLevel', e.target.value)}
                          className="mt-1 mr-3 text-primary focus:ring-primary"
                        />
                        <div>
                          <div className="font-medium text-tertiary">{level.label}</div>
                          <div className="text-sm text-gray-600 mt-1">{level.description}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isLoading || !isDirty}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
              {isDirty && (
                <p className="mt-2 text-sm text-gray-500 text-right">
                  You have unsaved changes
                </p>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfilePage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleAuthRequired = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/login';
    }
  };

  const handleRetry = () => {
    // Retry will be handled by the ProfileContext
    window.location.reload();
  };

  return (
    <ProfileErrorBoundary
      context="edit"
      onAuthRequired={handleAuthRequired}
      onRetry={handleRetry}
    >
      <ProfilePageContent />
    </ProfileErrorBoundary>
  );
};
