/**
 * Editor backup utility for critical failure recovery
 * Handles automatic backup creation and recovery of editor content
 */

export interface EditorBackup {
  id: string;
  postId: string | null;
  title: string;
  content: string;
  timestamp: number;
  source: 'auto' | 'manual' | 'error' | 'fallback';
  errorContext?: string;
  componentName?: string;
}

export interface BackupRecoveryOptions {
  maxAge?: number; // Maximum age in milliseconds
  maxBackups?: number; // Maximum number of backups to keep
  includeEmpty?: boolean; // Include backups with no content
}

const BACKUP_PREFIX = 'editor_backup_';
const FALLBACK_PREFIX = 'fallback_backup_';
const ERROR_PREFIX = 'error_backup_';

/**
 * Editor backup manager for critical failure recovery
 */
export class EditorBackupManager {
  /**
   * Create a backup of editor content
   */
  static createBackup(
    postId: string | null,
    title: string,
    content: string,
    source: EditorBackup['source'] = 'manual',
    errorContext?: string,
    componentName?: string
  ): string | null {
    try {
      // Don't create backup if no meaningful content
      if (!title.trim() && !content.trim()) {
        return null;
      }

      const backupId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const backup: EditorBackup = {
        id: backupId,
        postId,
        title,
        content,
        timestamp: Date.now(),
        source,
        errorContext,
        componentName
      };

      const key = this.getBackupKey(source, postId, backupId);
      localStorage.setItem(key, JSON.stringify(backup));

      return backupId;
    } catch (error) {
      console.warn('Failed to create editor backup:', error);
      return null;
    }
  }

  /**
   * Get backup key based on source and context
   */
  private static getBackupKey(source: EditorBackup['source'], postId: string | null, backupId: string): string {
    const prefix = source === 'fallback' ? FALLBACK_PREFIX :
                   source === 'error' ? ERROR_PREFIX :
                   BACKUP_PREFIX;
    return `${prefix}${postId || 'new'}_${backupId}`;
  }

  /**
   * Get all available backups
   */
  static getAllBackups(options: BackupRecoveryOptions = {}): EditorBackup[] {
    const {
      maxAge = 7 * 24 * 60 * 60 * 1000, // 7 days default
      maxBackups = 50,
      includeEmpty = false
    } = options;

    const backups: EditorBackup[] = [];
    const now = Date.now();

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !this.isBackupKey(key)) {
          continue;
        }

        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;

          const backup: EditorBackup = JSON.parse(stored);

          // Skip if too old
          if (now - backup.timestamp > maxAge) {
            continue;
          }

          // Skip empty backups if not requested
          if (!includeEmpty && !backup.title.trim() && !backup.content.trim()) {
            continue;
          }

          backups.push(backup);
        } catch (parseError) {
          console.warn(`Failed to parse backup ${key}:`, parseError);
          // Remove corrupted backup
          localStorage.removeItem(key);
        }
      }

      // Sort by timestamp (newest first) and limit
      return backups
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, maxBackups);
    } catch (error) {
      console.warn('Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Get backups for a specific post
   */
  static getPostBackups(postId: string | null, options: BackupRecoveryOptions = {}): EditorBackup[] {
    return this.getAllBackups(options).filter(backup => backup.postId === postId);
  }

  /**
   * Get the most recent backup for a post
   */
  static getLatestBackup(postId: string | null): EditorBackup | null {
    const backups = this.getPostBackups(postId, { maxBackups: 1 });
    return backups.length > 0 ? backups[0] : null;
  }

  /**
   * Get backup by ID
   */
  static getBackup(backupId: string): EditorBackup | null {
    try {
      // Try different prefixes
      const prefixes = [BACKUP_PREFIX, FALLBACK_PREFIX, ERROR_PREFIX];

      for (const prefix of prefixes) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key || !key.startsWith(prefix)) continue;

          try {
            const stored = localStorage.getItem(key);
            if (!stored) continue;

            const backup: EditorBackup = JSON.parse(stored);
            if (backup.id === backupId) {
              return backup;
            }
          } catch (parseError) {
            continue;
          }
        }
      }

      return null;
    } catch (error) {
      console.warn('Failed to get backup:', error);
      return null;
    }
  }

  /**
   * Delete a specific backup
   */
  static deleteBackup(backupId: string): boolean {
    try {
      const backup = this.getBackup(backupId);
      if (!backup) return false;

      // Find and remove the backup key
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !this.isBackupKey(key)) continue;

        try {
          const stored = localStorage.getItem(key);
          if (!stored) continue;

          const storedBackup: EditorBackup = JSON.parse(stored);
          if (storedBackup.id === backupId) {
            localStorage.removeItem(key);
            return true;
          }
        } catch (parseError) {
          continue;
        }
      }

      return false;
    } catch (error) {
      console.warn('Failed to delete backup:', error);
      return false;
    }
  }

  /**
   * Clean up old backups
   */
  static cleanupOldBackups(maxAge: number = 7 * 24 * 60 * 60 * 1000): number {
    let cleaned = 0;
    const now = Date.now();

    try {
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !this.isBackupKey(key)) continue;

        try {
          const stored = localStorage.getItem(key);
          if (!stored) {
            keysToRemove.push(key);
            continue;
          }

          const backup: EditorBackup = JSON.parse(stored);
          if (now - backup.timestamp > maxAge) {
            keysToRemove.push(key);
          }
        } catch (parseError) {
          // Remove corrupted backups
          keysToRemove.push(key);
        }
      }

      // Remove old/corrupted backups
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleaned++;
      });



      return cleaned;
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
      return 0;
    }
  }

  /**
   * Get backup statistics
   */
  static getBackupStats(): {
    total: number;
    bySource: Record<EditorBackup['source'], number>;
    totalSize: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    const stats = {
      total: 0,
      bySource: { auto: 0, manual: 0, error: 0, fallback: 0 } as Record<EditorBackup['source'], number>,
      totalSize: 0,
      oldestTimestamp: null as number | null,
      newestTimestamp: null as number | null
    };

    try {
      const backups = this.getAllBackups({ includeEmpty: true, maxBackups: 1000 });

      stats.total = backups.length;

      backups.forEach(backup => {
        stats.bySource[backup.source]++;
        stats.totalSize += JSON.stringify(backup).length;

        if (stats.oldestTimestamp === null || backup.timestamp < stats.oldestTimestamp) {
          stats.oldestTimestamp = backup.timestamp;
        }

        if (stats.newestTimestamp === null || backup.timestamp > stats.newestTimestamp) {
          stats.newestTimestamp = backup.timestamp;
        }
      });

      return stats;
    } catch (error) {
      console.warn('Failed to get backup stats:', error);
      return stats;
    }
  }

  /**
   * Check if a localStorage key is a backup key
   */
  private static isBackupKey(key: string): boolean {
    return key.startsWith(BACKUP_PREFIX) ||
           key.startsWith(FALLBACK_PREFIX) ||
           key.startsWith(ERROR_PREFIX);
  }

  /**
   * Create automatic backup on critical errors
   */
  static createErrorBackup(
    postId: string | null,
    title: string,
    content: string,
    error: Error,
    componentName?: string
  ): string | null {
    return this.createBackup(
      postId,
      title,
      content,
      'error',
      error.message,
      componentName
    );
  }

  /**
   * Create fallback backup when component fails
   */
  static createFallbackBackup(
    postId: string | null,
    title: string,
    content: string,
    componentName: string
  ): string | null {
    return this.createBackup(
      postId,
      title,
      content,
      'fallback',
      `Component failure: ${componentName}`,
      componentName
    );
  }

  /**
   * Check if localStorage has enough space for backups
   */
  static checkStorageSpace(): { available: boolean; usage: number; limit: number } {
    try {
      // Estimate localStorage usage
      let usage = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          usage += key.length + (value?.length || 0);
        }
      }

      // Most browsers have a 5-10MB limit for localStorage
      const estimatedLimit = 5 * 1024 * 1024; // 5MB
      const available = usage < estimatedLimit * 0.8; // Use 80% as threshold

      return { available, usage, limit: estimatedLimit };
    } catch (error) {
      console.warn('Failed to check storage space:', error);
      return { available: false, usage: 0, limit: 0 };
    }
  }
}
