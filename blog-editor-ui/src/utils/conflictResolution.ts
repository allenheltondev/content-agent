import type { BlogPost } from '../types';

export interface ConflictData {
  serverVersion: BlogPost;
  localTitle: string;
  localContent: string;
  localTimestamp: number;
}

export interface ConflictResolution {
  action: 'use_server' | 'use_local' | 'merge';
  title: string;
  content: string;
}

/**
 * Detect if there's a conflict between server and local versions
 */
export function detectConflict(
  serverPost: BlogPost,
  localTitle: string,
  localContent: string,
  localTimestamp: number
): boolean {
  // No conflict if local content matches server
  if (serverPost.title === localTitle && serverPost.body === localContent) {
    return false;
  }

  // Conflict if server was updated after local changes
  return serverPost.updatedAt > localTimestamp;
}

/**
 * Create conflict data for resolution
 */
export function createConflictData(
  serverPost: BlogPost,
  localTitle: string,
  localContent: string,
  localTimestamp: number
): ConflictData {
  return {
    serverVersion: serverPost,
    localTitle,
    localContent,
    localTimestamp
  };
}

/**
 * Simple merge strategy for text content
 * This is a basic implementation - in a real app you might want more sophisticated merging
 */
export function mergeContent(serverContent: string, localContent: string): string {
  // If one is empty, use the other
  if (!serverContent.trim()) return localContent;
  if (!localContent.trim()) return serverContent;

  // If they're the same, return either
  if (serverContent === localContent) return serverContent;

  // Simple merge: combine both with a separator
  return `${serverContent}\n\n--- MERGED CONTENT ---\n\n${localContent}`;
}

/**
 * Simple merge strategy for titles
 */
export function mergeTitle(serverTitle: string, localTitle: string): string {
  // If one is empty, use the other
  if (!serverTitle.trim()) return localTitle;
  if (!localTitle.trim()) return serverTitle;

  // If they're the same, return either
  if (serverTitle === localTitle) return serverTitle;

  // For titles, prefer the longer/more descriptive one
  return localTitle.length > serverTitle.length ? localTitle : serverTitle;
}

/**
 * Apply conflict resolution
 */
export function applyResolution(
  conflictData: ConflictData,
  resolution: ConflictResolution
): { title: string; content: string } {
  switch (resolution.action) {
    case 'use_server':
      return {
        title: conflictData.serverVersion.title,
        content: conflictData.serverVersion.body
      };

    case 'use_local':
      return {
        title: conflictData.localTitle,
        content: conflictData.localContent
      };

    case 'merge':
      return {
        title: resolution.title || mergeTitle(conflictData.serverVersion.title, conflictData.localTitle),
        content: resolution.content || mergeContent(conflictData.serverVersion.body, conflictData.localContent)
      };

    default:
      // Default to server version
      return {
        title: conflictData.serverVersion.title,
        content: conflictData.serverVersion.body
      };
  }
}

/**
 * Get conflict summary for display
 */
export function getConflictSummary(conflictData: ConflictData): {
  titleChanged: boolean;
  contentChanged: boolean;
  serverLastModified: Date;
  localLastModified: Date;
} {
  return {
    titleChanged: conflictData.serverVersion.title !== conflictData.localTitle,
    contentChanged: conflictData.serverVersion.body !== conflictData.localContent,
    serverLastModified: new Date(conflictData.serverVersion.updatedAt),
    localLastModified: new Date(conflictData.localTimestamp)
  };
}
