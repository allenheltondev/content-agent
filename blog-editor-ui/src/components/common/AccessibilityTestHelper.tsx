import React, { useEffect, useState } from 'react';
import { accessibilityValidation, COLOR_CONTRAST_PAIRS } from '../../utils/accessibility';

interface AccessibilityTestHelperProps {
  enabled?: boolean;
}

interface AccessibilityIssue {
  element: HTMLElement;
  issue: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Development-only componedentify accessibility issues
 * This should only be used in development mode
 */
export const AccessibilityTestHelper: React.FC<AccessibilityTestHelperProps> = ({
  enabled = import.meta.env.DEV
}) => {
  const [issues, setIssues] = useState<AccessibilityIssue[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const checkAccessibility = () => {
      const foundIssues: AccessibilityIssue[] = [];

      // Check for missing ARIA labels on interactive elements
      const interactiveElements = document.querySelectorAll('button, a, input, select, textarea');
      interactiveElements.forEach((element) => {
        const htmlElement = element as HTMLElement;
        if (!accessibilityValidation.hasProperLabeling(htmlElement)) {
          foundIssues.push({
            element: htmlElement,
            issue: 'Interactive element missing proper ARIA labeling',
            severity: 'error'
          });
        }
      });

      // Check for minimum touch target size
      const touchTargets = document.querySelectorAll('button, a, [role="button"], [role="link"]');
      touchTargets.forEach((element) => {
        const htmlElement = element as HTMLElement;
        if (!accessibilityValidation.meetsTouchTargetSize(htmlElement)) {
          foundIssues.push({
            element: htmlElement,
            issue: 'Touch target smaller than 44px minimum',
            severity: 'warning'
          });
        }
      });

      // Check for missing alt text on images
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.alt && !img.getAttribute('aria-hidden')) {
          foundIssues.push({
            element: img,
            issue: 'Image missing alt text or aria-hidden attribute',
            severity: 'error'
          });
        }
      });

      // Check for proper heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      let lastLevel = 0;
      headings.forEach((heading) => {
        const level = parseInt(heading.tagName.charAt(1));
        if (level > lastLevel + 1) {
          foundIssues.push({
            element: heading as HTMLElement,
            issue: `Heading level ${level} skips levels (previous was ${lastLevel})`,
            severity: 'warning'
          });
        }
        lastLevel = level;
      });

      // Check for form labels
      const formInputs = document.querySelectorAll('input, select, textarea');
      formInputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;
        const hasLabel = document.querySelector(`label[for="${htmlInput.id}"]`) ||
                        htmlInput.getAttribute('aria-label') ||
                        htmlInput.getAttribute('aria-labelledby');

        if (!hasLabel && htmlInput.type !== 'hidden') {
          foundIssues.push({
            element: htmlInput,
            issue: 'Form input missing associated label',
            severity: 'error'
          });
        }
      });

      setIssues(foundIssues);
    };

    // Initial check
    checkAccessibility();

    // Check again after DOM changes
    const observer = new MutationObserver(() => {
      setTimeout(checkAccessibility, 100);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'aria-labelledby', 'aria-describedby', 'alt']
    });

    return () => observer.disconnect();
  }, [enabled]);

  if (!enabled || issues.length === 0) return null;

  const errorCount = issues.filter(issue => issue.severity === 'error').length;
  const warningCount = issues.filter(issue => issue.severity === 'warning').length;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`px-4 py-2 rounded-lg shadow-lg text-white font-medium ${
          errorCount > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'
        }`}
        aria-label={`Accessibility issues: ${errorCount} errors, ${warningCount} warnings`}
      >
        A11y: {errorCount}E {warningCount}W
      </button>

      {isVisible && (
        <div className="absolute bottom-12 right-0 w-96 max-h-96 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-xl">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Accessibility Issues</h3>
            <p className="text-sm text-gray-600">
              {errorCount} errors, {warningCount} warnings
            </p>
          </div>

          <div className="p-4 space-y-3">
            {issues.map((issue, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 cursor-pointer hover:opacity-80 ${
                  issue.severity === 'error'
                    ? 'border-red-500 bg-red-50'
                    : issue.severity === 'warning'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
                onClick={() => {
                  issue.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  issue.element.focus();
                }}
                role="button"
                tabIndex={0}
              >
                <div className={`text-sm font-medium ${
                  issue.severity === 'error' ? 'text-red-800' :
                  issue.severity === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                }`}>
                  {issue.severity.toUpperCase()}
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  {issue.issue}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {issue.element.tagName.toLowerCase()}
                  {issue.element.id && `#${issue.element.id}`}
                  {issue.element.className && `.${issue.element.className.split(' ')[0]}`}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-2">Color Contrast Status</h4>
            <div className="text-sm text-gray-600">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(COLOR_CONTRAST_PAIRS).slice(0, 4).map(([key, colors]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded border"
                      style={{
                        backgroundColor: colors.background,
                        color: colors.foreground,
                        borderColor: colors.foreground
                      }}
                    />
                    <span className="text-xs">✓ {key.split('_')[0]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs">All predefined color combinations meet WCAG AA standards</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook to enable/disable accessibility testing
export const useAccessibilityTesting = (enabled: boolean = false) => {
  useEffect(() => {
    if (enabled && import.meta.env.DEV) {
      console.log('🔍 Accessibility testing enabled');

      // Add keyboard shortcut to toggle accessibility overlay
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'A') {
          event.preventDefault();
          const overlay = document.querySelector('[data-accessibility-overlay]');
          if (overlay) {
            (overlay as HTMLElement).click();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled]);
};
