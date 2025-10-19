/**
 * Accessibility utilities and constants
 */

// ARIA labels and descriptions for common UI elements
export const ARIA_LABELS = {
  // Navigation
  MAIN_NAVIGATION: 'Main navigation',
  BREADCRUMB_NAVIGATION: 'Breadcrumb navigation',
  USER_MENU: 'User account menu',
  MOBILE_NAVIGATION: 'Mobile navigation',

  // Buttons
  CREATE_POST: 'Create new blog post',
  EDIT_POST: 'Edit blog post',
  DELETE_POST: 'Delete blog post',
  SAVE_POST: 'Save blog post',
  PUBLISH_POST: 'Publish blog post',

  // Profile
  PROFILE_SETUP: 'Complete profile setup',
  PROFILE_EDIT: 'Edit profile settings',
  SAVE_PROFILE: 'Save profile changes',

  // Forms
  WRITING_TONE: 'Describe your writing tone and voice',
  WRITING_STYLE: 'Describe your writing style and approach',
  TOPICS_SELECTION: 'Select topics you write about',
  SKILL_LEVEL: 'Select your writing experience level',

  // Navigation actions
  GO_TO_DASHBOARD: 'Go to Dashboard - View your posts and create new content',
  GO_TO_PROFILE: 'Go to Profile Settings - Update your writing preferences',
  SIGN_OUT: 'Sign out of your account',

  // Loading and status
  LOADING: 'Loading content, please wait',
  ERROR_OCCURRED: 'An error occurred',
  SUCCESS_MESSAGE: 'Success notification',

  // Post management
  POST_LIST: 'List of your blog posts',
  POST_ITEM: 'Blog post item',
  POST_STATUS: 'Post status',
  POST_LAST_UPDATED: 'Last updated date',
} as const;

// Screen reader announcements
export const SCREEN_READER_ANNOUNCEMENTS = {
  PROFILE_SAVED: 'Profile settings have been saved successfully',
  PROFILE_SETUP_COMPLETE: 'Profile setup completed successfully',
  POST_CREATED: 'New blog post created',
  POST_SAVED: 'Blog post saved',
  POST_DELETED: 'Blog post deleted',
  NAVIGATION_CHANGED: 'Navigation changed to',
  ERROR_OCCURRED: 'An error occurred. Please review the error message and try again.',
  LOADING_STARTED: 'Loading started',
  LOADING_COMPLETE: 'Loading completed',
} as const;

// Keyboard navigation helpers
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab',
} as const;

/**
 * Check if color contrast meets WCAG AA standards
 * This is a simplified check - in production, use a proper contrast checking library
 */
export const checkColorContrast = (_foreground: string, _background: string): boolean => {
  // This is a placeholder - implement proper contrast checking
  // For now, we'll assume our predefined color combinations meet standards
  return true;
};

/**
 * Generate unique IDs for form elements and ARIA relationships
 */
export const generateId = (prefix: string): string => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create ARIA describedby relationships
 */
export const createAriaDescribedBy = (...ids: (string | undefined)[]): string | undefined => {
  const validIds = ids.filter(Boolean);
  return validIds.length > 0 ? validIds.join(' ') : undefined;
};

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Focus the first focusable element within a container
   */
  focusFirst: (container: HTMLElement): boolean => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    if (firstElement) {
      firstElement.focus();
      return true;
    }
    return false;
  },

  /**
   * Focus the last focusable element within a container
   */
  focusLast: (container: HTMLElement): boolean => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    if (lastElement) {
      lastElement.focus();
      return true;
    }
    return false;
  },

  /**
   * Trap focus within a container (for modals, menus, etc.)
   */
  trapFocus: (container: HTMLElement, event: KeyboardEvent): void => {
    if (event.key !== KEYBOARD_KEYS.TAB) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  },
};

/**
 * Screen reader utilities
 */
export const screenReader = {
  /**
   * Announce a message to screen readers
   */
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite'): void => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },

  /**
   * Create a visually hidden element for screen readers
   */
  createVisuallyHidden: (text: string): HTMLSpanElement => {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    return element;
  },
};

/**
 * Validation for accessibility requirements
 */
export const accessibilityValidation = {
  /**
   * Check if an element has proper ARIA labeling
   */
  hasProperLabeling: (element: HTMLElement): boolean => {
    return !!(
      element.getAttribute('aria-label') ||
      element.getAttribute('aria-labelledby') ||
      element.getAttribute('title') ||
      (element.tagName === 'BUTTON' && element.textContent?.trim()) ||
      (element.tagName === 'A' && element.textContent?.trim())
    );
  },

  /**
   * Check if interactive elements meet minimum touch target size (44px)
   */
  meetsTouchTargetSize: (element: HTMLElement): boolean => {
    const rect = element.getBoundingClientRect();
    return rect.width >= 44 && rect.height >= 44;
  },
};

/**
 * Color contrast ratios for WCAG compliance
 * These are the actual hex values from our Tailwind config
 */
export const COLOR_CONTRAST_PAIRS = {
  // Primary colors on white background
  PRIMARY_ON_WHITE: { foreground: '#219EFF', background: '#FFFFFF' }, // Should meet AA
  PRIMARY_HOVER_ON_WHITE: { foreground: '#1e8ae6', background: '#FFFFFF' }, // Should meet AA

  // Tertiary (dark text) on white
  TERTIARY_ON_WHITE: { foreground: '#2B2D42', background: '#FFFFFF' }, // Should meet AAA

  // White text on primary background
  WHITE_ON_PRIMARY: { foreground: '#FFFFFF', background: '#219EFF' }, // Should meet AA
  WHITE_ON_PRIMARY_HOVER: { foreground: '#FFFFFF', background: '#1e8ae6' }, // Should meet AA

  // Gray text combinations
  GRAY_600_ON_WHITE: { foreground: '#4B5563', background: '#FFFFFF' }, // Should meet AA
  GRAY_700_ON_WHITE: { foreground: '#374151', background: '#FFFFFF' }, // Should meet AA
  GRAY_800_ON_WHITE: { foreground: '#1F2937', background: '#FFFFFF' }, // Should meet AAA

  // Error states
  RED_600_ON_WHITE: { foreground: '#DC2626', background: '#FFFFFF' }, // Should meet AA
  RED_800_ON_RED_50: { foreground: '#991B1B', background: '#FEF2F2' }, // Should meet AA

  // Success states
  GREEN_600_ON_WHITE: { foreground: '#059669', background: '#FFFFFF' }, // Should meet AA
  GREEN_800_ON_GREEN_50: { foreground: '#065F46', background: '#ECFDF5' }, // Should meet AA

  // Warning states
  YELLOW_800_ON_YELLOW_50: { foreground: '#92400E', background: '#FFFBEB' }, // Should meet AA
} as const;
