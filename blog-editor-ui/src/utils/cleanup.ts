/**
 * Cleanup utilities for managing application data lifecycle
 */

import { LocalStorageManager } from './localStorage';

/**
 * Initialize app cleanup on startup
 */
export function initializeApp(): void {
  try {
    // Check if localStorage is available
    if (!LocalStorageManager.isAvailable()) {
      console.warn('localStorage is not available, some features may not work properly');
      return;
    }

    // Perform initial cleanup of old data
    LocalStorageManager.cleanupOldDrafts();

    console.log('App initialization completed');
  } catch (error) {
    console.error('App initialization failed:', error);
  }
}

/**
 * Cleanup on user logout
 */
export function cleanupOnLogout(): void {
  try {
    // Clear all user-specific data
    LocalStorageManager.clearProfileSetupDraft();
    LocalStorageManager.clearNewPostDraft();

    // Clean up sensitive data
    LocalStorageManager.cleanupSensitiveData();

    // Clean up old drafts
    LocalStorageManager.cleanupOldDrafts();

    console.log('Logout cleanup completed');
  } catch (error) {
    console.warn('Logout cleanup failed:', error);
  }
}

/**
 * Cleanup on profile completion
 */
export function cleanupOnProfileCompletion(): void {
  try {
    // Clear profile setup data
    LocalStorageManager.clearProfileSetupDraft();

    // Clean up sensitive data
    LocalStorageManager.cleanupSensitiveData();

    console.log('Profile completion cleanup completed');
  } catch (error) {
    console.warn('Profile completion cleanup failed:', error);
  }
}

/**
 * Cleanup on post creation/save
 */
export function cleanupOnPostSave(isNewPost: boolean): void {
  try {
    if (isNewPost) {
      // Clear new post draft
      LocalStorageManager.clearNewPostDraft();
    }

    // General cleanup of old drafts
    LocalStorageManager.cleanupOldDrafts();

    console.log('Post save cleanup completed');
  } catch (error) {
    console.warn('Post save cleanup failed:', error);
  }
}

/**
 * Emergency cleanup - clears all application data
 */
export function emergencyCleanup(): void {
  try {
    LocalStorageManager.performCompleteCleanup();
    console.log('Emergency cleanup completed');
  } catch (error) {
    console.warn('Emergency cleanup failed:', error);
  }
}

/**
 * Get cleanup status and storage information
 */
export function getCleanupStatus(): {
  storageInfo: ReturnType<typeof LocalStorageManager.getStorageInfo>;
  recommendsCleanup: boolean;
} {
  try {
    const storageInfo = LocalStorageManager.getStorageInfo();

    // Recommend cleanup if there are many draft keys or large storage usage
    const recommendsCleanup = storageInfo.draftKeys > 10 ||
                             storageInfo.estimatedSize > 1024 * 1024; // 1MB

    return {
      storageInfo,
      recommendsCleanup
    };
  } catch (error) {
    console.warn('Failed to get cleanup status:', error);
    return {
      storageInfo: {
        totalKeys: 0,
        draftKeys: 0,
        estimatedSize: 0,
        hasProfileDraft: false,
        hasNewPostDraft: false
      },
      recommendsCleanup: false
    };
  }
}
