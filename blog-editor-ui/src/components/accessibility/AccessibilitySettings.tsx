import { useState } from 'react';
import { useHighContrastMode } from '../../hooks/useHighContrastMode';

interface AccessibilitySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * AccessibilitySettings component provides user controls for accessibility preferences
 */
export const AccessibilitySettings = ({ isOpen, onClose, className = '' }: AccessibilitySettingsProps) => {
  const {
    isHighContrast,
    userPreference,
    setHighContrastPreference
  } = useHighContrastMode();

  const [announcements, setAnnouncements] = useState(() => {
    return localStorage.getItem('accessibility-announcements') !== 'false';
  });

  const [reducedMotion, setReducedMotion] = useState(() => {
    return localStorage.getItem('accessibility-reduced-motion') === 'true';
  });

  const handleAnnouncementsChange = (enabled: boolean) => {
    setAnnouncements(enabled);
    localStorage.setItem('accessibility-announcements', enabled.toString());
  };

  const handleReducedMotionChange = (enabled: boolean) => {
    setReducedMotion(enabled);
    localStorage.setItem('accessibility-reduced-motion', enabled.toString());

    // Apply reduced motion preference
    if (enabled) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      document.documentElement.style.setProperty('--transition-duration', '0.01ms');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
      document.documentElement.style.removeProperty('--transition-duration');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-settings-title"
    >
      <div
        className={`bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="accessibility-settings-title" className="text-xl font-semibold text-gray-900">
            Accessibility Settings
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label="Close accessibility settings"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* High Contrast Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              High Contrast Mode
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="highContrast"
                  value="auto"
                  checked={userPreference === 'auto'}
                  onChange={() => setHighContrastPreference('auto')}
                  className="mr-2 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  Auto (follow system preference)
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="highContrast"
                  value="enabled"
                  checked={userPreference === 'enabled'}
                  onChange={() => setHighContrastPreference('enabled')}
                  className="mr-2 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  Always enabled
                </span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="highContrast"
                  value="disabled"
                  checked={userPreference === 'disabled'}
                  onChange={() => setHighContrastPreference('disabled')}
                  className="mr-2 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  Always disabled
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Current status: {isHighContrast ? 'Active' : 'Inactive'}
            </p>
          </div>

          {/* Screen Reader Announcements */}
          <div>
            <label className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-medium text-gray-700">
                  Screen Reader Announcements
                </span>
                <span className="text-xs text-gray-500">
                  Announce mode changes and important updates
                </span>
              </div>
              <input
                type="checkbox"
                checked={announcements}
                onChange={(e) => handleAnnouncementsChange(e.target.checked)}
                className="ml-3 focus:ring-2 focus:ring-blue-500"
                aria-describedby="announcements-description"
              />
            </label>
            <p id="announcements-description" className="text-xs text-gray-500 mt-1">
              When enabled, important changes like mode switches will be announced to screen readers
            </p>
          </div>

          {/* Reduced Motion */}
          <div>
            <label className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-medium text-gray-700">
                  Reduce Motion
                </span>
                <span className="text-xs text-gray-500">
                  Minimize animations and transitions
                </span>
              </div>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => handleReducedMotionChange(e.target.checked)}
                className="ml-3 focus:ring-2 focus:ring-blue-500"
                aria-describedby="reduced-motion-description"
              />
            </label>
            <p id="reduced-motion-description" className="text-xs text-gray-500 mt-1">
              Reduces animations for users who prefer minimal motion
            </p>
          </div>

          {/* Keyboard Shortcuts Reference */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Keyboard Shortcuts
            </h3>
            <div className="bg-gray-50 rounded-md p-3 text-xs text-gray-600">
              <div className="grid grid-cols-1 gap-1">
                <div className="flex justify-between">
                  <span>Toggle Edit/Review mode:</span>
                  <kbd className="bg-white px-1 rounded border">Ctrl+M</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Save content:</span>
                  <kbd className="bg-white px-1 rounded border">Ctrl+S</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Navigate suggestions:</span>
                  <kbd className="bg-white px-1 rounded border">← →</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Accept suggestion:</span>
                  <kbd className="bg-white px-1 rounded border">Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Reject suggestion:</span>
                  <kbd className="bg-white px-1 rounded border">Esc</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
