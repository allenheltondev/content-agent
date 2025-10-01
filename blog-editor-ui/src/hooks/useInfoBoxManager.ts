import { useCallback, useState, useEffect } from 'react';
import type { DismissedInfoBoxes } from '../types';

const STORAGE_KEY = 'betterer_dismissed_info_boxes';
const APP_VERSION = '1.0.0'; // This should ideally come from package.json or environment

interface UseInfoBoxManagerReturn {
  isDismissed: (id: string) => boolean;
  dismissInfoBox: (id: string) => void;
  resetAllInfoBoxes: () => void;
  isStorageAvailable: boolean;
}

/**
 * Hook for managing InfoBox dismissed state with localStorage persistence
 * Provides graceful degradation when localStorage is unavailable
 */
export const useInfoBoxManager = (): UseInfoBoxManagerReturn => {
  const [dismissedBoxes, setDismissedBoxes] = useState<DismissedInfoBoxes>({});
  const [isStorageAvailable, setIsStorageAvailable] = useState(true);

  // Check if localStorage is available and working
  const checkStorageAvailability = useCallback((): boolean => {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      console.warn('localStorage is not available:', error);
      return false;
    }
  }, []);

  // Load dismissed boxes from localStorage with error handling
  const loadDismissedBoxes = useCallback((): DismissedInfoBoxes => {
    if (!isStorageAvailable) {
      return {};
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return {};
      }

      const parsed = JSON.parse(stored);

      // Validate the structure of stored data
      if (typeof parsed !== 'object' || parsed === null) {
        console.warn('Invalid dismissed info boxes data structure, resetting');
        return {};
      }

      // Validate each entry has required properties
      const validated: DismissedInfoBoxes = {};
      for (const [id, data] of Object.entries(parsed)) {
        if (
          typeof data === 'object' &&
          data !== null &&
          typeof (data as any).dismissedAt === 'string' &&
          typeof (data as any).version === 'string'
        ) {
          validated[id] = data as DismissedInfoBoxes[string];
        } else {
          console.warn(`Invalid data for info box ${id}, skipping`);
        }
      }

      return validated;
    } catch (error) {
      console.error('Failed to load dismissed info boxes:', error);
      return {};
    }
  }, [isStorageAvailable]);

  // Save dismissed boxes to localStorage with error handling
  const saveDismissedBoxes = useCallback((boxes: DismissedInfoBoxes): void => {
    if (!isStorageAvailable) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(boxes));
    } catch (error) {
      console.error('Failed to save dismissed info boxes:', error);
      // If storage fails, we continue without persistence
      // The user experience is degraded but not broken
    }
  }, [isStorageAvailable]);

  // Initialize storage availability and load data on mount
  useEffect(() => {
    const storageAvailable = checkStorageAvailability();
    setIsStorageAvailable(storageAvailable);

    if (storageAvailable) {
      const loaded = loadDismissedBoxes();
      setDismissedBoxes(loaded);
    }
  }, [checkStorageAvailability, loadDismissedBoxes]);

  // Check if a specific info box is dismissed
  const isDismissed = useCallback((id: string): boolean => {
    return id in dismissedBoxes;
  }, [dismissedBoxes]);

  // Dismiss an info box and persist the state
  const dismissInfoBox = useCallback((id: string): void => {
    const newDismissedBoxes = {
      ...dismissedBoxes,
      [id]: {
        dismissedAt: new Date().toISOString(),
        version: APP_VERSION,
      },
    };

    setDismissedBoxes(newDismissedBoxes);
    saveDismissedBoxes(newDismissedBoxes);
  }, [dismissedBoxes, saveDismissedBoxes]);

  // Reset all dismissed info boxes (useful for testing or user preference)
  const resetAllInfoBoxes = useCallback((): void => {
    setDismissedBoxes({});

    if (isStorageAvailable) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error('Failed to reset dismissed info boxes:', error);
      }
    }
  }, [isStorageAvailable]);

  return {
    isDismissed,
    dismissInfoBox,
    resetAllInfoBoxes,
    isStorageAvailable,
  };
};
