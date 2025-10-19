import { useCallback } from 'react';
import { useProfileContext } from '../contexts/ProfileContext';
import type { UpdateProfileRequest } from '../types';

/**
 * Hook for profile operations with enhanced error handling and loading states
 */
export const useProfile = () => {
  const {
    profile,
    isLoading,
    error,
    updateProfile: contextUpdateProfile,
    refreshProfile: contextRefreshProfile,
    isProfileComplete,
    isCheckingProfile,
  } = useProfileContext();

  const updateProfile = useCallback(async (profileData: UpdateProfileRequest) => {
    try {
      const updatedProfile = await contextUpdateProfile(profileData);
      return { success: true, profile: updatedProfile };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      return { success: false, error: errorMessage };
    }
  }, [contextUpdateProfile]);

  const refreshProfile = useCallback(async () => {
    try {
      await contextRefreshProfile();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh profile';
      return { success: false, error: errorMessage };
    }
  }, [contextRefreshProfile]);

  return {
    // Profile data
    profile,
    isProfileComplete,

    // Loading states
    isLoading,
    isCheckingProfile,

    // Error state
    error,

    // Operations
    updateProfile,
    refreshProfile,

    // Computed properties
    hasProfile: profile !== null,
    needsProfileSetup: !isCheckingProfile && !profile,
  };
};
