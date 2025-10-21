import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for detecting and managing high contrast mode support
 */
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [userPreference, setUserPreference] = useState<'auto' | 'enabled' | 'disabled'>('auto');

  // Detect system high contrast mode
  const detectSystemHighContrast = useCallback(() => {
    // Check for Windows high contrast mode
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        return highContrastQuery.matches;
      } catch {
        // Fallback for browsers that don't support prefers-contrast
      }
    }

    // Fallback: Check for forced colors (Windows high contrast)
    if (typeof window !== 'undefined' && window.matchMedia) {
      try {
        const forcedColorsQuery = window.matchMedia('(forced-colors: active)');
        return forcedColorsQuery.matches;
      } catch {
        // Fallback for browsers that don't support forced-colors
      }
    }

    return false;
  }, []);

  // Update high contrast state
  const updateHighContrastState = useCallback(() => {
    const systemHighContrast = detectSystemHighContrast();

    switch (userPreference) {
      case 'enabled':
        setIsHighContrast(true);
        break;
      case 'disabled':
        setIsHighContrast(false);
        break;
      case 'auto':
      default:
        setIsHighContrast(systemHighContrast);
        break;
    }
  }, [userPreference, detectSystemHighContrast]);

  // Set user preference
  const setHighContrastPreference = useCallback((preference: 'auto' | 'enabled' | 'disabled') => {
    setUserPreference(preference);
    localStorage.setItem('high-contrast-preference', preference);
  }, []);

  // Get high contrast classes for components
  const getHighContrastClasses = useCallback((baseClasses: string, highContrastClasses: string) => {
    return isHighContrast ? `${baseClasses} ${highContrastClasses}` : baseClasses;
  }, [isHighContrast]);

  // Get mode-specific high contrast classes
  const getModeHighContrastClasses = useCallback((mode: 'edit' | 'review', isActive: boolean) => {
    if (!isHighContrast) return '';

    const baseHighContrast = 'border-2 focus:ring-4';

    if (isActive) {
      return mode === 'edit'
        ? `${baseHighContrast} bg-blue-900 border-blue-300 text-white focus:ring-blue-300`
        : `${baseHighContrast} bg-green-900 border-green-300 text-white focus:ring-green-300`;
    }

    return `${baseHighContrast} bg-white border-gray-900 text-black hover:bg-gray-100 focus:ring-gray-900`;
  }, [isHighContrast]);

  // Get suggestion type high contrast classes
  const getSuggestionHighContrastClasses = useCallback((type: string) => {
    if (!isHighContrast) return '';

    const baseClasses = 'border-2 focus:ring-4';

    switch (type.toLowerCase()) {
      case 'llm':
        return `${baseClasses} border-blue-900 focus:ring-blue-900`;
      case 'brand':
        return `${baseClasses} border-purple-900 focus:ring-purple-900`;
      case 'fact':
        return `${baseClasses} border-orange-900 focus:ring-orange-900`;
      case 'grammar':
        return `${baseClasses} border-green-900 focus:ring-green-900`;
      case 'spelling':
        return `${baseClasses} border-red-900 focus:ring-red-900`;
      default:
        return `${baseClasses} border-gray-900 focus:ring-gray-900`;
    }
  }, [isHighContrast]);

  // Get loading indicator high contrast classes
  const getLoadingHighContrastClasses = useCallback(() => {
    return isHighContrast
      ? 'border-4 border-gray-900 border-t-blue-900'
      : '';
  }, [isHighContrast]);

  // Initialize from localStorage and system preferences
  useEffect(() => {
    const savedPreference = localStorage.getItem('high-contrast-preference') as 'auto' | 'enabled' | 'disabled' | null;
    if (savedPreference) {
      setUserPreference(savedPreference);
    }
  }, []);

  // Update state when preference changes
  useEffect(() => {
    updateHighContrastState();
  }, [updateHighContrastState]);

  // Listen for system preference changes
  useEffect(() => {
    if (window.matchMedia) {
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
      const forcedColorsQuery = window.matchMedia('(forced-colors: active)');

      const handleChange = () => {
        if (userPreference === 'auto') {
          updateHighContrastState();
        }
      };

      highContrastQuery.addEventListener('change', handleChange);
      forcedColorsQuery.addEventListener('change', handleChange);

      return () => {
        highContrastQuery.removeEventListener('change', handleChange);
        forcedColorsQuery.removeEventListener('change', handleChange);
      };
    }
  }, [userPreference, updateHighContrastState]);

  // Apply high contrast class to document
  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    return () => {
      document.documentElement.classList.remove('high-contrast');
    };
  }, [isHighContrast]);

  return {
    isHighContrast,
    userPreference,
    setHighContrastPreference,
    getHighContrastClasses,
    getModeHighContrastClasses,
    getSuggestionHighContrastClasses,
    getLoadingHighContrastClasses,
  };
};
