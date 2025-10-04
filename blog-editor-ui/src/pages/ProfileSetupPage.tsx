import { useState, useId, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useToast } from '../hooks/useToast';
import { useProfileSetup } from '../hooks/useProfileSetup';
import { Logo } from '../components/common/Logo';
import { ProfileErrorBoundary, ProfileErrorDisplay, ProfileOperationLoading } from '../components/profile';
import { ProfileSetupRecoveryNotification } from '../components/profile/ProfileSetupRecoveryNotification';
import { ARIA_LABELS, KEYBOARD_KEYS, screenReader, generateId, createAriaDescribedBy } from '../utils/accessibility';
import { LocalStorageManager } from '../utils/localStorage';
import type { ProfileSetupData, CreateProfileRequest } from '../types';

// Predefined topic options
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

// Skill level options with encouraging descriptions
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

const ProfileSetupPageContent = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Track if component is mounted to prevent navigation after unmount
  const [isMounted, setIsMounted] = useState(true);

  // Use the enhanced profile setup hook
  const {
    formData,
    isLoading,
    error,
    validationErrors,
    updateFormData,
    nextStep,
    previousStep,
    submitProfile,
    hasRecoverableData,
    showRecoveryPrompt,
    recoverDraftData,
    dismissRecoveryPrompt,
    clearDraftData,
    isFirstStep,
    isLastStep,
    completionPercentage
  } = useProfileSetup();

  // Set page title
  usePageTitle('Profile Setup');

  // Generate unique IDs for form elements
  const writingToneId = useId();
  const writingStyleId = useId();
  const topicsFieldsetId = useId();
  const skillLevelFieldsetId = useId();
  const writingToneHelpId = generateId('writing-tone-help');
  const writingStyleHelpId = generateId('writing-style-help');
  const topicsHelpId = generateId('topics-help');
  const skillLevelHelpId = generateId('skill-level-help');

  // Custom topic input
  const [customTopic, setCustomTopic] = useState('');
  const [showCustomTopicInput, setShowCustomTopicInput] = useState(false);

  // Total number of steps
  const TOTAL_STEPS = 4;

  // Cleanup on unmount
  useEffect(() => {
    // Add beforeunload listener to detect page refreshes
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      console.log('ProfileSetup: Page is about to unload/refresh');
      if (formData.isSubmitting) {
        console.log('ProfileSetup: Page unloading during submission!');
        event.preventDefault();
        event.returnValue = 'Profile setup is in progress. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Mark component as unmounted
      setIsMounted(false);
      // Remove event listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Perform cleanup when component unmounts
      LocalStorageManager.cleanupOldDrafts();
    };
  }, [formData.isSubmitting]);

  // Handle input changes
  const handleInputChange = (field: keyof ProfileSetupData, value: any) => {
    const newValidationErrors = { ...validationErrors };
    delete newValidationErrors[field as string]; // Remove error when user starts typing

    updateFormData({
      [field]: value,
      validationErrors: newValidationErrors
    });
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

  // Navigation functions
  const goToNextStep = () => {
    const success = nextStep();
    if (!success) {
      // Announce validation errors to screen readers
      screenReader.announce('Please correct the errors in the current step before proceeding.', 'assertive');
    } else {
      // Announce step change to screen readers
      screenReader.announce(`Moved to step ${formData.currentStep} of ${TOTAL_STEPS}`, 'polite');
    }
  };

  const goToPreviousStep = () => {
    previousStep();
    // Announce step change to screen readers
    screenReader.announce(`Moved to step ${formData.currentStep} of ${TOTAL_STEPS}`, 'polite');
  };

  // Handle form submission
  const handleSubmit = async (event?: React.MouseEvent) => {
    // Prevent any default behavior that might cause page refresh
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Prevent multiple submissions
    if (isLoading || formData.isSubmitting) {
      return;
    }

    try {
      const result = await submitProfile();

      // Check if component is still mounted before proceeding
      if (!isMounted) {
        return;
      }

      if (result.success) {
        showSuccess('Profile setup complete! Welcome to Betterer!');
        screenReader.announce('Profile setup completed successfully. Redirecting to dashboard.', 'assertive');

        // Perform final cleanup
        LocalStorageManager.performCompleteCleanup();

        // Navigate immediately - the AppRouter will handle the redirect logic
        navigate('/dashboard', { replace: true });
      } else {
        showError(result.error || 'Please complete all required fields');
        // Announce validation errors to screen readers
        screenReader.announce('Form has validation errors. Please review and correct the highlighted fields.', 'assertive');
      }
    } catch (error) {
      console.error('ProfileSetup: Unexpected error during submission:', error);
      showError('An unexpected error occurred. Please try again.');
    }
  };

  // Handle recovery
  const handleRecoverData = () => {
    const recovered = recoverDraftData();
    if (recovered) {
      showSuccess('Previous progress recovered successfully!');
      screenReader.announce('Previous profile setup progress has been recovered.', 'polite');
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      // Clear draft data before logout
      clearDraftData();
      LocalStorageManager.performCompleteCleanup();

      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
      showError('Failed to sign out. Please try again.');
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (formData.currentStep) {
      case 1:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-tertiary mb-2">
                What's Your Writing Tone?
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Describe how you like to communicate with your readers. Are you formal, casual, friendly, professional, humorous?
              </p>
            </div>

            <div>
              <label htmlFor={writingToneId} className="block text-sm font-medium text-tertiary mb-2">
                Writing Tone
              </label>
              <textarea
                id={writingToneId}
                rows={4}
                aria-describedby={createAriaDescribedBy(
                  writingToneHelpId,
                  validationErrors.writingTone ? `${writingToneId}-error` : undefined
                )}
                aria-invalid={!!validationErrors.writingTone}
                aria-required="true"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                  validationErrors.writingTone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="For example: I like to write in a friendly, conversational tone that makes complex topics feel approachable. I use humor when appropriate and always aim to connect with my readers on a personal level."
                value={formData.writingTone}
                onChange={(e) => handleInputChange('writingTone', e.target.value)}
              />
              {validationErrors.writingTone && (
                <p id={`${writingToneId}-error`} className="mt-1 text-sm text-red-600" role="alert">
                  {validationErrors.writingTone}
                </p>
              )}
              <p id={writingToneHelpId} className="mt-2 text-sm text-gray-600">
                This helps our AI understand your voice and provide suggestions that match your style.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-tertiary mb-2">
                What's Your Writing Style?
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Tell us about your approach to writing. Do you prefer short paragraphs, detailed explanations, storytelling, data-driven content?
              </p>
            </div>

            <div>
              <label htmlFor={writingStyleId} className="block text-sm font-medium text-tertiary mb-2">
                Writing Style
              </label>
              <textarea
                id={writingStyleId}
                rows={4}
                aria-describedby={createAriaDescribedBy(
                  writingStyleHelpId,
                  validationErrors.writingStyle ? `${writingStyleId}-error` : undefined
                )}
                aria-invalid={!!validationErrors.writingStyle}
                aria-required="true"
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${
                  validationErrors.writingStyle ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="For example: I prefer to write in short, digestible paragraphs with clear headings. I like to start with a story or example, then dive into the details. I use bullet points and numbered lists to make information easy to scan."
                value={formData.writingStyle}
                onChange={(e) => handleInputChange('writingStyle', e.target.value)}
              />
              {validationErrors.writingStyle && (
                <p id={`${writingStyleId}-error`} className="mt-1 text-sm text-red-600" role="alert">
                  {validationErrors.writingStyle}
                </p>
              )}
              <p id={writingStyleHelpId} className="mt-2 text-sm text-gray-600">
                This helps us suggest improvements that align with your preferred writing approach.
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-tertiary mb-2">
                What Topics Do You Write About?
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                Select the topics you're passionate about. This helps us provide more relevant suggestions and examples.
              </p>
            </div>

            <fieldset aria-describedby={createAriaDescribedBy(topicsHelpId, validationErrors.topics ? `${topicsFieldsetId}-error` : undefined)}>
              <legend className="sr-only">Select topics you write about</legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 mb-4" role="group" aria-labelledby={topicsFieldsetId}>
                {PREDEFINED_TOPICS.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleTopicToggle(topic)}
                    aria-pressed={formData.topics.includes(topic)}
                    aria-label={`${formData.topics.includes(topic) ? 'Remove' : 'Add'} ${topic} topic`}
                    className={`px-3 py-2 text-sm rounded-md border transition-colors min-h-touch ${
                      formData.topics.includes(topic)
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary hover:text-primary'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </fieldset>

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

              {validationErrors.topics && (
                <p id={`${topicsFieldsetId}-error`} className="mt-1 text-sm text-red-600" role="alert">
                  {validationErrors.topics}
                </p>
              )}
              <p id={topicsHelpId} className="mt-2 text-sm text-gray-600">
                Select the topics you're passionate about. This helps us provide more relevant suggestions and examples.
              </p>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-tertiary mb-2">
                What's Your Writing Experience?
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                This helps us tailor our suggestions to your experience level. Remember, every expert was once a beginner!
              </p>
            </div>

            <fieldset aria-describedby={skillLevelHelpId}>
              <legend className="sr-only">Select your writing experience level</legend>
              <div className="space-y-4" role="radiogroup" aria-labelledby={skillLevelFieldsetId}>
                {SKILL_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className={`block p-4 border rounded-lg cursor-pointer transition-colors min-h-touch ${
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
                        aria-describedby={`${level.value}-description`}
                        className="mt-1 mr-3 text-primary focus:ring-primary focus:ring-2"
                      />
                      <div>
                        <div className="font-medium text-tertiary">{level.label}</div>
                        <div id={`${level.value}-description`} className="text-sm text-gray-600 mt-1">{level.description}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <p id={skillLevelHelpId} className="mt-4 text-sm text-gray-600">
                This helps us tailor our suggestions to your experience level. Remember, every expert was once a beginner!
              </p>
            </fieldset>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4 sm:mb-6">
          <Logo size="lg" showText={true} />
        </div>
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary">
            Let's Set Up Your Profile
          </h1>
          <p className="mt-2 text-sm sm:text-base text-gray-600">
            Help us personalize your writing experience
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-6 sm:py-8 px-4 sm:px-6 lg:px-10 shadow-xl rounded-lg sm:rounded-xl border border-gray-100 hover:shadow-2xl transition-shadow duration-300">
          {/* Progress indicator */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-medium text-tertiary">
                Step {formData.currentStep} of {TOTAL_STEPS}
              </span>
              <span className="text-xs sm:text-sm text-gray-500">
                {Math.round(completionPercentage)}% Complete
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary-hover h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Recovery notification */}
          {showRecoveryPrompt && (
            <div className="mb-6">
              <ProfileSetupRecoveryNotification
                onRecover={handleRecoverData}
                onDismiss={dismissRecoveryPrompt}
              />
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mb-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-red-800">Profile Setup Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error instanceof Error ? error.message : 'An error occurred during profile setup'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step content */}
          <div className="mb-6 sm:mb-8">
            {renderStepContent()}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <div>
              {!isFirstStep && (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  disabled={isLoading}
                  aria-label={`Go to previous step (${formData.currentStep - 1} of ${TOTAL_STEPS})`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed min-h-touch"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              )}
            </div>

            <div className="flex gap-3">
              {!isLastStep ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={isLoading}
                  aria-label={`Go to next step (${formData.currentStep + 1} of ${TOTAL_STEPS})`}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed min-h-touch"
                >
                  Next
                  <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  aria-label={isLoading ? 'Setting up your profile, please wait' : 'Complete profile setup'}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed min-h-touch"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Setting up...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <svg className="h-4 w-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Logout option */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center">
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Sign out instead
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProfileSetupPage = () => {
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

  return (
    <ProfileErrorBoundary
      context="setup"
      onAuthRequired={handleAuthRequired}
    >
      <ProfileSetupPageContent />
    </ProfileErrorBoundary>
  );
};
