import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { UserProfile, CreateProfileRequest, UpdateProfileRequest, ApiError } from '../types';
import { apiService } from '../services/ApiService';
import { useAuth } from '../hooks/useAuth';
import { logError, isRetryableError } from '../utils/apiErrorHandler';
import { LocalStorageManager } from '../utils/localStorage';
import type { MigrationResult } from '../utils/migration';

interface ProfileContextType {
  // Profile data
  profile: UserProfile | null;
  isLoading: boolean;
  error: ApiError | Error | null;

  // Profile operations
  createProfile: (profileData: CreateProfileRequest) => Promise<UserProfile>;
  updateProfile: (profileData: UpdateProfileRequest) => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
  clearProfile: () => void;
  clearError: () => void;
  retryLastOperation: () => Promise<void>;

  // Profile setup state
  isProfileComplete: boolean;
  isCheckingProfile: boolean;

  // Migration state
  isMigrating: boolean;
  migrationResult: MigrationResult | null;

  // Error handling state
  retryCount: number;
  canRetry: boolean;
  lastOperation: 'create' | 'update' | 'load' | null;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export const ProfileProvider = ({ children }: ProfileProviderProps) => {
  const { isAuthenticated, user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [error, setError] = useState<ApiError | Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastOperation, setLastOperation] = useState<'create' | 'update' | 'load' | null>(null);
  const [lastOperationData, setLastOperationData] = useState<CreateProfileRequest | UpdateProfileRequest | null>(null);

  // Migration state (simplified)
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);

  // Derived state
  const isProfileComplete = profile?.isComplete ?? false;
  const canRetry = error ? isRetryableError(error) && retryCount < 3 : false;
  const maxRetries = 3;

  // Load profile when user authenticates (simplified approach)
  useEffect(() => {
    if (isAuthenticated && user) {
      loadProfileSimple();
    } else {
      clearProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]); // Only depend on auth state, not the functions

  // Simplified profile loading without complex migration logic
  const loadProfileSimple = useCallback(async () => {
    try {
      setIsCheckingProfile(true);
      setError(null);

      const userProfile = await apiService.getProfile();
      setProfile(userProfile);
      setError(null);

      // Mark migration as completed if profile exists
      LocalStorageManager.setMigrationStatus({
        profileMigrationCompleted: true
      });
    } catch (err) {
      const error = err as ApiError | Error;

      // If profile doesn't exist (404), that's expected for new users
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        setProfile(null);
        setError(null); // Don't treat missing profile as an error
      } else {
        console.error('ProfileContext: Unexpected error loading profile:', error);
        setError(error);
      }
    } finally {
      setIsCheckingProfile(false);
    }
  }, []);

  const loadProfile = useCallback(async (isRetry = false) => {
    try {
      setIsCheckingProfile(true);
      if (!isRetry) {
        setError(null);
        setRetryCount(0);
      }
      setLastOperation('load');
      setLastOperationData(null);

      const userProfile = await apiService.getProfile();
      setProfile(userProfile);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      const error = err as ApiError | Error;
      logError(error, 'ProfileContext:loadProfile');

      // If profile doesn't exist (404), that's expected for new users
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        setProfile(null);
        setError(null); // Don't treat missing profile as an error
      } else {
        setError(error);
        if (isRetry) {
          setRetryCount(prev => prev + 1);
        }
      }
    } finally {
      setIsCheckingProfile(false);
    }
  }, []);

  const createProfile = useCallback(async (profileData: CreateProfileRequest, isRetry = false): Promise<UserProfile> => {
    try {
      setIsLoading(true);
      if (!isRetry) {
        setError(null);
        setRetryCount(0);
      }
      setLastOperation('create');
      setLastOperationData(profileData);

      const newProfile = await apiService.createProfile(profileData);
      setProfile(newProfile);
      setError(null);
      setRetryCount(0);

      // Mark migration as completed and perform cleanup
      LocalStorageManager.setMigrationStatus({
        profileMigrationCompleted: true
      });
      LocalStorageManager.performCompleteCleanup();

      return newProfile;
    } catch (err) {
      console.error('ProfileContext: Error during profile creation:', err);
      const error = err as ApiError | Error;
      logError(error, 'ProfileContext:createProfile');
      setError(error);

      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profileData: UpdateProfileRequest, isRetry = false): Promise<UserProfile> => {
    try {
      setIsLoading(true);
      if (!isRetry) {
        setError(null);
        setRetryCount(0);
      }
      setLastOperation('update');
      setLastOperationData(profileData);

      const updatedProfile = await apiService.updateProfile(profileData);
      setProfile(updatedProfile);
      setError(null);
      setRetryCount(0);

      return updatedProfile;
    } catch (err) {
      const error = err as ApiError | Error;
      logError(error, 'ProfileContext:updateProfile');
      setError(error);

      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;
    await loadProfileSimple();
  }, [isAuthenticated, loadProfileSimple]);

  const clearProfile = useCallback((): void => {
    setProfile(null);
    setError(null);
    setIsLoading(false);
    setIsCheckingProfile(false);
    setRetryCount(0);
    setLastOperation(null);
    setLastOperationData(null);
    setIsMigrating(false);
    setMigrationResult(null);

    // Perform cleanup when clearing profile
    LocalStorageManager.performCompleteCleanup();
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
    setRetryCount(0);
  }, []);

  const retryLastOperation = useCallback(async (): Promise<void> => {
    if (!lastOperation || retryCount >= maxRetries) {
      return;
    }

    try {
      switch (lastOperation) {
        case 'load':
          await loadProfileSimple();
          break;
        case 'create':
          if (lastOperationData) {
            await createProfile(lastOperationData as CreateProfileRequest, true);
          }
          break;
        case 'update':
          if (lastOperationData) {
            await updateProfile(lastOperationData as UpdateProfileRequest, true);
          }
          break;
      }
    } catch (error) {
      // Error is already handled in the individual methods
      console.log('Retry failed:', error);
    }
  }, [lastOperation, lastOperationData, retryCount, maxRetries, loadProfile, createProfile, updateProfile]);

  const value: ProfileContextType = {
    profile,
    isLoading,
    error,
    createProfile,
    updateProfile,
    refreshProfile,
    clearProfile,
    clearError,
    retryLastOperation,
    isProfileComplete,
    isCheckingProfile,
    retryCount,
    canRetry,
    lastOperation,
    isMigrating,
    migrationResult,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileContext = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfileContext must be used within a ProfileProvider');
  }
  return context;
};
