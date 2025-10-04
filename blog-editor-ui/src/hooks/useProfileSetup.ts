import { useState, useCallback, useEffect } from 'react';
import { useProfileContext } from '../contexts/ProfileContext';
import { LocalStorageManager } from '../utils/localStorage';
import type { CreateProfileRequest, ProfileSetupData } from '../types';

/**
 * Hook for managing profile setup flow with form state and validation
 * Enhanced with comprehensive data persistence and recovery
 */
export const useProfileSetup = () => {
  const { createProfile, isLoading, error } = useProfileContext();

  // Form state management
  const [formData, setFormData] = useState<ProfileSetupData>({
    writingTone: '',
    writingStyle: '',
    topics: [],
    skillLevel: 'beginner',
    currentStep: 1,
    isSubmitting: false,
    validationErrors: {},
  });

  // Recovery state
  const [hasRecoverableData, setHasRecoverableData] = useState(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);

  // Load draft data from localStorage on mount
  const loadDraftData = useCallback(() => {
    try {
      const savedData = LocalStorageManager.getProfileSetupDraft();
      if (savedData) {
        setFormData(prev => ({
          ...prev,
          writingTone: savedData.writingTone,
          writingStyle: savedData.writingStyle,
          topics: savedData.topics,
          skillLevel: savedData.skillLevel,
          currentStep: savedData.currentStep,
          isSubmitting: false, // Reset submission state
          validationErrors: {}, // Reset validation errors
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Failed to load draft profile data:', err);
      return false;
    }
  }, []);

  // Save draft data to localStorage
  const saveDraftData = useCallback((data: Partial<ProfileSetupData>) => {
    try {
      LocalStorageManager.saveProfileSetupDraft({
        writingTone: data.writingTone || formData.writingTone,
        writingStyle: data.writingStyle || formData.writingStyle,
        topics: data.topics || formData.topics,
        skillLevel: data.skillLevel || formData.skillLevel,
        currentStep: data.currentStep || formData.currentStep,
      });
    } catch (err) {
      console.warn('Failed to save draft profile data:', err);
    }
  }, [formData]);

  // Clear draft data from localStorage
  const clearDraftData = useCallback(() => {
    try {
      LocalStorageManager.clearProfileSetupDraft();
      setHasRecoverableData(false);
      setShowRecoveryPrompt(false);
    } catch (err) {
      console.warn('Failed to clear draft profile data:', err);
    }
  }, []);

  // Check for recoverable data on mount
  useEffect(() => {
    const checkRecoverableData = () => {
      const hasRecentDraft = LocalStorageManager.hasRecentProfileSetupDraft();
      setHasRecoverableData(hasRecentDraft);

      if (hasRecentDraft) {
        // Show recovery prompt if there's recent data and form is empty
        const isEmpty = !formData.writingTone && !formData.writingStyle &&
                       formData.topics.length === 0 && formData.currentStep === 1;
        setShowRecoveryPrompt(isEmpty);
      }
    };

    checkRecoverableData();
  }, [formData.writingTone, formData.writingStyle, formData.topics.length, formData.currentStep]);

  // Auto-save draft data when form changes
  useEffect(() => {
    const hasContent = formData.writingTone || formData.writingStyle ||
                      formData.topics.length > 0 || formData.currentStep > 1;

    if (hasContent) {
      const timeoutId = setTimeout(() => {
        saveDraftData(formData);
      }, 1000); // Debounce saves

      return () => clearTimeout(timeoutId);
    }
  }, [formData, saveDraftData]);

  // Update form data with automatic draft saving
  const updateFormData = useCallback((updates: Partial<ProfileSetupData>) => {
    setFormData(prev => {
      const newData = { ...prev, ...updates };
      saveDraftData(newData);
      return newData;
    });
  }, [saveDraftData]);

  // Validation functions
  const validateStep = useCallback((step: number, data: ProfileSetupData): Record<string, string> => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Writing tone step
        if (!data.writingTone.trim()) {
          errors.writingTone = 'Please describe your writing tone';
        } else if (data.writingTone.trim().length < 10) {
          errors.writingTone = 'Please provide a more detailed description (at least 10 characters)';
        }
        break;

      case 2: // Writing style step
        if (!data.writingStyle.trim()) {
          errors.writingStyle = 'Please describe your writing style';
        } else if (data.writingStyle.trim().length < 10) {
          errors.writingStyle = 'Please provide a more detailed description (at least 10 characters)';
        }
        break;

      case 3: // Topics step
        if (data.topics.length === 0) {
          errors.topics = 'Please select at least one topic';
        }
        break;

      case 4: // Skill level step
        if (!data.skillLevel) {
          errors.skillLevel = 'Please select your skill level';
        }
        break;
    }

    return errors;
  }, []);

  // Navigate to next step with validation
  const nextStep = useCallback(() => {
    const errors = validateStep(formData.currentStep, formData);

    if (Object.keys(errors).length > 0) {
      updateFormData({ validationErrors: errors });
      return false;
    }

    updateFormData({
      currentStep: formData.currentStep + 1,
      validationErrors: {},
    });
    return true;
  }, [formData, validateStep, updateFormData]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    if (formData.currentStep > 1) {
      updateFormData({
        currentStep: formData.currentStep - 1,
        validationErrors: {},
      });
    }
  }, [formData.currentStep, updateFormData]);

  // Go to specific step
  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 4) {
      updateFormData({
        currentStep: step,
        validationErrors: {},
      });
    }
  }, [updateFormData]);

  // Recover draft data
  const recoverDraftData = useCallback(() => {
    const recovered = loadDraftData();
    if (recovered) {
      setShowRecoveryPrompt(false);
      return true;
    }
    return false;
  }, [loadDraftData]);

  // Dismiss recovery prompt
  const dismissRecoveryPrompt = useCallback(() => {
    setShowRecoveryPrompt(false);
  }, []);

  // Submit profile setup
  const submitProfile = useCallback(async () => {
    try {
      // Validate all steps
      const allErrors: Record<string, string> = {};
      for (let step = 1; step <= 4; step++) {
        const stepErrors = validateStep(step, formData);
        Object.assign(allErrors, stepErrors);
      }

      if (Object.keys(allErrors).length > 0) {
        updateFormData({ validationErrors: allErrors });
        return { success: false, error: 'Please fix validation errors' };
      }

      updateFormData({ isSubmitting: true });

      const profileRequest: CreateProfileRequest = {
        writingTone: formData.writingTone.trim(),
        writingStyle: formData.writingStyle.trim(),
        topics: formData.topics,
        skillLevel: formData.skillLevel,
      };

      const profile = await createProfile(profileRequest);

      // Clear draft data on successful submission and perform cleanup
      clearDraftData();
      LocalStorageManager.cleanupSensitiveData();

      return { success: true, profile };
    } catch (err) {
      console.error('useProfileSetup: Error during profile submission:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create profile';
      return { success: false, error: errorMessage };
    } finally {
      updateFormData({ isSubmitting: false });
    }
  }, [formData, validateStep, updateFormData, createProfile, clearDraftData]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData({
      writingTone: '',
      writingStyle: '',
      topics: [],
      skillLevel: 'beginner',
      currentStep: 1,
      isSubmitting: false,
      validationErrors: {},
    });
    clearDraftData();
  }, [clearDraftData]);

  return {
    // Form data
    formData,

    // Loading states
    isLoading: isLoading || formData.isSubmitting,
    isSubmitting: formData.isSubmitting,

    // Error state
    error,
    validationErrors: formData.validationErrors,

    // Form operations
    updateFormData,
    resetForm,

    // Step navigation
    nextStep,
    previousStep,
    goToStep,

    // Validation
    validateStep: (step?: number) => validateStep(step || formData.currentStep, formData),

    // Submission
    submitProfile,

    // Draft management
    loadDraftData,
    saveDraftData,
    clearDraftData,

    // Recovery features
    hasRecoverableData,
    showRecoveryPrompt,
    recoverDraftData,
    dismissRecoveryPrompt,

    // Computed properties
    isFirstStep: formData.currentStep === 1,
    isLastStep: formData.currentStep === 4,
    canProceed: Object.keys(validateStep(formData.currentStep, formData)).length === 0,
    completionPercentage: (formData.currentStep / 4) * 100,
  };
};
