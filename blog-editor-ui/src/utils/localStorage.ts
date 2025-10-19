/**
 * Comprehensive local storage utility for data persistence and recovery
 * Handles profile setup data, new post content, and sensitive data cleanup
 */

// Storage keys
export const STORAGE_KEYS = {
  PROFILE_SETUP_DRAFT: 'profile_setup_draft',
  NEW_POST_DRAFT: 'new_post_draft',
  DISMISSED_INFO_BOXES: 'dismissed_info_boxes',
  EDITOR_PREFERENCES: 'editor_preferences',
  DRAFT_PREFIX: 'draft_'
} as const;

// Data interfaces
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



// Sensitive data patterns to clean up
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
 * Get current app version (fallback to timestamp if not available)
 */
function getAppVersion(): string {
  // In a real app, this would come from package.json or build process
  return import.meta.env.VITE_APP_VERSION || Date.now().toString();
}

/**
 * Safe JSON parse with error handling
 */
function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse JSON from localStorage:', error);
    return fallback;
  }
}

/**
 * Safe localStorage operations with error handling
 */
export class LocalStorageManager {
  /**
   * Save profile setup draft data
   */
  static saveProfileSetupDraft(data: Partial<ProfileSetupDraft>): void {
    // Disabled: no-op for hackathon to avoid local draft persistence
    return;
  }

  /**
   * Get profile setup draft data
   */
  static getProfileSetupDraft(): ProfileSetupDraft | null {
    // Disabled: no local profile draft recovery
    return null;
  }

  /**
   * Clear profile setup draft data
   */
  static clearProfileSetupDraft(): void {
    // Disabled: no-op
    return;
  }

  /**
   * Check if profile setup draft exists and is recent
   */
  static hasRecentProfileSetupDraft(maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
    // Disabled: always false
    return false;
  }

  /**
   * Save new post draft data
   */
  static saveNewPostDraft(data: Partial<NewPostDraft>): void {
    // Disabled: no-op
    return;
  }

  /**
   * Get new post draft data
   */
  static getNewPostDraft(): NewPostDraft | null {
    // Disabled: no local new-post draft recovery
    return null;
  }

  /**
   * Clear new post draft data
   */
  static clearNewPostDraft(): void {
    // Disabled: no-op
    return;
  }

  /**
   * Check if new post draft exists and is recent
   */
  static hasRecentNewPostDraft(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
    // Disabled: always false
    return false;
  }



  /**
   * Clean up sensitive data from localStorage
   */
  static cleanupSensitiveData(): void {
    try {
      const keysToRemove: string[] = [];

      // Check all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && isSensitiveKey(key)) {
          keysToRemove.push(key);
        }
      }

      // Remove sensitive keys
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          console.log(`Cleaned up sensitive data: ${key}`);
        } catch (error) {
          console.warn(`Failed to remove sensitive key ${key}:`, error);
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup sensitive data:', error);
    }
  }

  /**
   * Clean up old draft data based on age
   */
  static cleanupOldDrafts(maxAgeMs: number = 30 * 24 * 60 * 60 * 1000): void {
    // Disabled: no-op
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

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          totalKeys++;
          const value = localStorage.getItem(key);
          if (value) {
            estimatedSize += key.length + value.length;
          }

          if (key.includes('draft') || key.startsWith(STORAGE_KEYS.DRAFT_PREFIX)) {
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
      // Clean up profile setup data
      this.clearProfileSetupDraft();

      // Clean up sensitive data
      this.cleanupSensitiveData();

      // Clean up old drafts
      this.cleanupOldDrafts();

      console.log('Performed complete localStorage cleanup');
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
