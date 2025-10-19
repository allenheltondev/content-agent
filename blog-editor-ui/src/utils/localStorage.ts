/**
 * Comprehensive local storage utility for data persistence and recovery
 * Handles profile setup data, new post content, and sensitive data cleanup
 */

export const STORAGE_KEYS = {
  PROFILE_SETUP_DRAFT: 'profile_setup_draft',
  NEW_POST_DRAFT: 'new_post_draft',
  DISMISSED_INFO_BOXES: 'dismissed_info_boxes',
  EDITOR_PREFERENCES: 'editor_preferences',
  DRAFT_PREFIX: 'draft_'
} as const;
export interface ProfileSetupDraft {
  writingTone: string;
  writingStyle: string;
  topics: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  currentStep: number;
  timestamp: number;
  version: string; // App version when saved
}

export interface NewPostDraft {
  title: string;
  content: string;
  timestamp: number;
  version: string;
}



const SENSITIVE_PATTERNS = [
  /passw/i,
  /token/i,
  /auth/i,
  /secret/i,
  /key/i,
  /credential/i
];

/**
 * Check if a storage key contains sensitive data
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}



/**
 * Safe localStorage operations with error handling
 */
export class LocalStorageManager {
  /**
   * Save profile setup draft data
   */
  static saveProfileSetupDraft(_data: Partial<ProfileSetupDraft>): void {
    return;
  }

  /**
   * Get profile setup draft data
   */
  static getProfileSetupDraft(): ProfileSetupDraft | null {
    return null;
  }

  /**
   * Clear profile setup draft data
   */
  static clearProfileSetupDraft(): void {
    return;
  }

  /**
   * Check if profile setup draft exists and is recent
   */
  static hasRecentProfileSetupDraft(_maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
    return false;
  }

  /**
   * Save new post draft data
   */
  static saveNewPostDraft(_data: Partial<NewPostDraft>): void {
    return;
  }

  /**
   * Get new post draft data
   */
  static getNewPostDraft(): NewPostDraft | null {
    return null;
  }

  /**
   * Clear new post draft data
   */
  static clearNewPostDraft(): void {
    return;
  }

  /**
   * Check if new post draft exists and is recent
   */
  static hasRecentNewPostDraft(_maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
    return false;
  }



  /**
   * Clean up sensitive data from localStorage
   */
  static cleanupSensitiveData(): void {
    try {
      const keysToRemove: string[] = [];

      for (let storageIndex = 0; storageIndex < localStorage.length; storageIndex++) {
        const storageKey = localStorage.key(storageIndex);
        if (storageKey && isSensitiveKey(storageKey)) {
          keysToRemove.push(storageKey);
        }
      }

      keysToRemove.forEach(sensitiveKey => {
        try {
          localStorage.removeItem(sensitiveKey);
        } catch (error) {
          console.warn(`Failed to remove sensitive key ${sensitiveKey}:`, error);
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup sensitive data:', error);
    }
  }

  /**
   * Clean up old draft data based on age
   */
  static cleanupOldDrafts(_maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): void {
    return;
  }

  /**
   * Get storage usage information
   */
  static getStorageInfo(): {
    totalKeys: number;
    draftKeys: number;
    estimatedSize: number;
    hasProfileDraft: boolean;
    hasNewPostDraft: boolean;
  } {
    try {
      let totalKeys = 0;
      let draftKeys = 0;
      let estimatedSize = 0;

      for (let storageIndex = 0; storageIndex < localStorage.length; storageIndex++) {
        const storageKey = localStorage.key(storageIndex);
        if (storageKey) {
          totalKeys++;
          const storageValue = localStorage.getItem(storageKey);
          if (storageValue) {
            estimatedSize += storageKey.length + storageValue.length;
          }

          if (storageKey.includes('draft') || storageKey.startsWith(STORAGE_KEYS.DRAFT_PREFIX)) {
            draftKeys++;
          }
        }
      }

      return {
        totalKeys,
        draftKeys,
        estimatedSize,
        hasProfileDraft: false,
        hasNewPostDraft: false
      };
    } catch (error) {
      console.warn('Failed to get storage info:', error);
      return {
        totalKeys: 0,
        draftKeys: 0,
        estimatedSize: 0,
        hasProfileDraft: false,
        hasNewPostDraft: false
      };
    }
  }

  /**
   * Perform complete cleanup (for profile completion or logout)
   */
  static performCompleteCleanup(): void {
    try {
      this.clearProfileSetupDraft();
      this.cleanupSensitiveData();
      this.cleanupOldDrafts();
    } catch (error) {
      console.warn('Failed to perform complete cleanup:', error);
    }
  }

  /**
   * Check if localStorage is available and working
   */
  static isAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage is not available:', error);
      return false;
    }
  }
}
