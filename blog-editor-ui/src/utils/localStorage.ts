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
  DRAFT_PREFIX: 'draft_',
  MIGRATION_STATUS: 'migration_status'
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

export interface MigrationStatus {
  profileMigrationCompleted: boolean;
  lastMigrationVersion: string;
  timestamp: number;
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
    try {
      const existing = this.getProfileSetupDraft();
      const draftData: ProfileSetupDraft = {
        writingTone: data.writingTone || existing?.writingTone || '',
        writingStyle: data.writingStyle || existing?.writingStyle || '',
        topics: data.topics || existing?.topics || [],
        skillLevel: data.skillLevel || existing?.skillLevel || 'beginner',
        currentStep: data.currentStep || existing?.currentStep || 1,
        timestamp: Date.now(),
        version: getAppVersion()
      };

      localStorage.setItem(STORAGE_KEYS.PROFILE_SETUP_DRAFT, JSON.stringify(draftData));
    } catch (error) {
      console.warn('Failed to save profile setup draft:', error);
    }
  }

  /**
   * Get profile setup draft data
   */
  static getProfileSetupDraft(): ProfileSetupDraft | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PROFILE_SETUP_DRAFT);
      return safeJsonParse(stored, null);
    } catch (error) {
      console.warn('Failed to load profile setup draft:', error);
      return null;
    }
  }

  /**
   * Clear profile setup draft data
   */
  static clearProfileSetupDraft(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE_SETUP_DRAFT);
    } catch (error) {
      console.warn('Failed to clear profile setup draft:', error);
    }
  }

  /**
   * Check if profile setup draft exists and is recent
   */
  static hasRecentProfileSetupDraft(maxAgeMs: number = 24 * 60 * 60 * 1000): boolean {
    const draft = this.getProfileSetupDraft();
    if (!draft) return false;

    const age = Date.now() - draft.timestamp;
    return age <= maxAgeMs;
  }

  /**
   * Save new post draft data
   */
  static saveNewPostDraft(data: Partial<NewPostDraft>): void {
    try {
      const existing = this.getNewPostDraft();
      const draftData: NewPostDraft = {
        title: data.title || existing?.title || '',
        content: data.content || existing?.content || '',
        timestamp: Date.now(),
        version: getAppVersion()
      };

      // Only save if there's actual content
      if (draftData.title.trim() || draftData.content.trim()) {
        localStorage.setItem(STORAGE_KEYS.NEW_POST_DRAFT, JSON.stringify(draftData));
      } else {
        this.clearNewPostDraft();
      }
    } catch (error) {
      console.warn('Failed to save new post draft:', error);
    }
  }

  /**
   * Get new post draft data
   */
  static getNewPostDraft(): NewPostDraft | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NEW_POST_DRAFT);
      return safeJsonParse(stored, null);
    } catch (error) {
      console.warn('Failed to load new post draft:', error);
      return null;
    }
  }

  /**
   * Clear new post draft data
   */
  static clearNewPostDraft(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.NEW_POST_DRAFT);
    } catch (error) {
      console.warn('Failed to clear new post draft:', error);
    }
  }

  /**
   * Check if new post draft exists and is recent
   */
  static hasRecentNewPostDraft(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): boolean {
    const draft = this.getNewPostDraft();
    if (!draft) return false;

    const age = Date.now() - draft.timestamp;
    return age <= maxAgeMs && Boolean(draft.title.trim() || draft.content.trim());
  }

  /**
   * Get migration status
   */
  static getMigrationStatus(): MigrationStatus | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MIGRATION_STATUS);
      return safeJsonParse(stored, null);
    } catch (error) {
      console.warn('Failed to load migration status:', error);
      return null;
    }
  }

  /**
   * Set migration status
   */
  static setMigrationStatus(status: Partial<MigrationStatus>): void {
    try {
      const existing = this.getMigrationStatus();
      const migrationStatus: MigrationStatus = {
        profileMigrationCompleted: status.profileMigrationCompleted ?? existing?.profileMigrationCompleted ?? false,
        lastMigrationVersion: status.lastMigrationVersion || getAppVersion(),
        timestamp: Date.now()
      };

      localStorage.setItem(STORAGE_KEYS.MIGRATION_STATUS, JSON.stringify(migrationStatus));
    } catch (error) {
      console.warn('Failed to save migration status:', error);
    }
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
    try {
      const now = Date.now();

      // Clean up old profile setup drafts
      const profileDraft = this.getProfileSetupDraft();
      if (profileDraft && (now - profileDraft.timestamp) > maxAgeMs) {
        this.clearProfileSetupDraft();
        console.log('Cleaned up old profile setup draft');
      }

      // Clean up old new post drafts
      const postDraft = this.getNewPostDraft();
      if (postDraft && (now - postDraft.timestamp) > maxAgeMs) {
        this.clearNewPostDraft();
        console.log('Cleaned up old new post draft');
      }

      // Clean up old regular post drafts
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEYS.DRAFT_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const data = JSON.parse(stored);
              if (data.timestamp && (now - data.timestamp) > maxAgeMs) {
                localStorage.removeItem(key);
                console.log(`Cleaned up old draft: ${key}`);
              }
            }
          } catch (error) {
            // If we can't parse it, it's probably corrupted, so remove it
            localStorage.removeItem(key);
            console.log(`Cleaned up corrupted draft: ${key}`);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old drafts:', error);
    }
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
        hasProfileDraft: !!this.getProfileSetupDraft(),
        hasNewPostDraft: !!this.getNewPostDraft()
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
