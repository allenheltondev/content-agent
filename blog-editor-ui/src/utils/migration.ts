/**
 * Migration utilities for handling existing users without profiles
 * and data structure updates
 */

import { LocalStorageManager } from './localStorage';
import { apiService } from '../services/ApiService';
import type { UserProfile } from '../types';

export interface MigrationResult {
  success: boolean;
  profileCreated?: boolean;
  error?: string;
  requiresProfileSetup?: boolean;
}

/**
 * Check if user needs profile migration
 */
export async function checkProfileMigrationNeeded(): Promise<boolean> {
  try {
    const migrationStatus = LocalStorageManager.getMigrationStatus();

    // If migration was already completed, no need to check again
    if (migrationStatus?.profileMigrationCompleted) {
      return false;
    }

    // Try to get user profile
    try {
      await apiService.getProfile();
      // Profile exists, mark migration as completed
      LocalStorageManager.setMigrationStatus({
        profileMigrationCompleted: true
      });
      return false;
    } catch (error) {
      // Profile doesn't exist (404) or other error
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return true; // Profile migration needed
      }
      // Other errors - assume migration not needed to avoid blocking
      return false;
    }
  } catch (error) {
    console.warn('Failed to check profile migration status:', error);
    return false;
  }
}

/**
 * Perform profile migration for existing users
 */
export async function performProfileMigration(): Promise<MigrationResult> {
  try {
    // Check if profile already exists
    try {
      const existingProfile = await apiService.getProfile();
      if (existingProfile) {
        // Profile already exists, mark migration as completed
        LocalStorageManager.setMigrationStatus({
          profileMigrationCompleted: true
        });
        return {
          success: true,
          profileCreated: false
        };
      }
    } catch (error) {
      // Profile doesn't exist, continue with migration
      if (!(error && typeof error === 'object' && 'status' in error && error.status === 404)) {
        throw error; // Re-throw non-404 errors
      }
    }

    // Check if there's a draft profile setup that can be used
    const profileDraft = LocalStorageManager.getProfileSetupDraft();

    if (profileDraft &&
        profileDraft.writingTone &&
        profileDraft.writingStyle &&
        profileDraft.topics.length > 0) {

      try {
        // Attempt to create profile from draft
        const profile = await apiService.createProfile({
          writingTone: profileDraft.writingTone,
          writingStyle: profileDraft.writingStyle,
          topics: profileDraft.topics,
          skillLevel: profileDraft.skillLevel
        });

        // Clear the draft since it was successfully used
        LocalStorageManager.clearProfileSetupDraft();

        // Mark migration as completed
        LocalStorageManager.setMigrationStatus({
          profileMigrationCompleted: true
        });

        return {
          success: true,
          profileCreated: true
        };
      } catch (error) {
        console.warn('Failed to create profile from draft during migration:', error);
        // Fall through to require profile setup
      }
    }

    // No usable draft found, user needs to complete profile setup
    return {
      success: true,
      profileCreated: false,
      requiresProfileSetup: true
    };

  } catch (error) {
    console.error('Profile migration failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed'
    };
  }
}

/**
 * Clean up old data structures and perform general migrations
 */
export function performDataMigration(): void {
  try {
    // Clean up old localStorage keys that are no longer used
    const keysToRemove = [
      'profile_setup_form_data', // Old profile setup key
      'editor_draft_data', // Old editor draft key
      'user_preferences_old', // Old preferences key
    ];

    keysToRemove.forEach(key => {
      try {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log(`Cleaned up old localStorage key: ${key}`);
        }
      } catch (error) {
        console.warn(`Failed to remove old key ${key}:`, error);
      }
    });

    // Perform general cleanup
    LocalStorageManager.cleanupOldDrafts();
    LocalStorageManager.cleanupSensitiveData();

    console.log('Data migration completed successfully');
  } catch (error) {
    console.warn('Data migration failed:', error);
  }
}

/**
 * Check if app version has changed and perform necessary migrations
 */
export function checkVersionMigration(): boolean {
  try {
    const currentVersion = import.meta.env.VITE_APP_VERSION || '1.0.0';
    const migrationStatus = LocalStorageManager.getMigrationStatus();

    if (!migrationStatus || migrationStatus.lastMigrationVersion !== currentVersion) {
      // Version changed, perform data migration
      performDataMigration();

      // Update migration status
      LocalStorageManager.setMigrationStatus({
        profileMigrationCompleted: migrationStatus?.profileMigrationCompleted ?? false,
        lastMigrationVersion: currentVersion
      });

      return true; // Migration was performed
    }

    return false; // No migration needed
  } catch (error) {
    console.warn('Version migration check failed:', error);
    return false;
  }
}

/**
 * Initialize migrations on app startup
 */
export async function initializeMigrations(): Promise<{
  profileMigrationNeeded: boolean;
  versionMigrationPerformed: boolean;
}> {
  try {
    // Check version migration first
    const versionMigrationPerformed = checkVersionMigration();

    // Check if profile migration is needed
    const profileMigrationNeeded = await checkProfileMigrationNeeded();

    return {
      profileMigrationNeeded,
      versionMigrationPerformed
    };
  } catch (error) {
    console.error('Migration initialization failed:', error);
    return {
      profileMigrationNeeded: false,
      versionMigrationPerformed: false
    };
  }
}
