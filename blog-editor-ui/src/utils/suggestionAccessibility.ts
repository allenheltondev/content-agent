import type { Suggestion, SuggestionType } from '../types';

/**
 * Accessibility utilities for suggestion components
 */

/**
 * Generate accessible label for suggestion items
 */
export function getSuggestionAccessibleLabel(suggestion: Suggestion): string {
  const typeNames = {
    llm: 'Writing Enhancement',
    brand: 'Brand Guidelines',
    fact: 'Fact Check',
    grammar: 'Grammar',
    spelling: 'Spelling'
  };

  const typeName = typeNames[suggestion.type];
  const priority = suggestion.priority;

  return `${typeName} suggestion, ${priority} priority. Change "${suggestion.textToReplace}" to "${suggestion.replaceWith}". ${suggestion.reason || ''}`;
}

/**
 * Generate accessible description for suggestion actions
 */
export function getSuggestionActionLabel(action: 'accept' | 'reject' | 'delete', suggestion: Suggestion): string {
  const actionLabels = {
    accept: 'Accept this suggestion and apply the change',
    reject: 'Reject this suggestion without applying the change',
    delete: 'Delete this suggestion permanently'
  };

  const typeNames = {
    llm: 'writing enhancement',
    brand: 'brand guidelines',
    fact: 'fact check',
    grammar: 'grammar',
    spelling: 'spelling'
  };

  return `${actionLabels[action]} for ${typeNames[suggestion.type]} suggestion`;
}

/**
 * Check if color contrast meets WCAG AA standards
 */
export function checkColorContrast(foreground: string, background: string): boolean {
  // Convert hex colors to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Calculate relative luminance
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) return false;

  const fgLuminance = getLuminance(fg.r, fg.g, fg.b);
  const bgLuminance = getLuminance(bg.r, bg.g, bg.b);

  const contrast = (Math.max(fgLuminance, bgLuminance) + 0.05) /
                   (Math.min(fgLuminance, bgLuminance) + 0.05);

  // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
  return contrast >= 4.5;
}

/**
 * Get accessible color combinations for suggestion types
 */
export function getAccessibleSuggestionColors(type: SuggestionType) {
  // These colors have been tested for WCAG AA compliance
  const accessibleColors = {
    llm: {
      bg: '#e6f3ff',
      border: '#0066cc',
      text: '#003d7a',
      badge: '#cce7ff'
    },
    brand: {
      bg: '#f0e6ff',
      border: '#7c3aed',
      text: '#4c1d95',
      badge: '#ddd6fe'
    },
    fact: {
      bg: '#fff4e6',
      border: '#ea580c',
      text: '#9a3412',
      badge: '#fed7aa'
    },
    grammar: {
      bg: '#f0fdf4',
      border: '#16a34a',
      text: '#14532d',
      badge: '#bbf7d0'
    },
    spelling: {
      bg: '#fef2f2',
      border: '#dc2626',
      text: '#991b1b',
      badge: '#fecaca'
    }
  };

  return accessibleColors[type];
}

/**
 * Generate keyboard navigation instructions
 */
export function getKeyboardInstructions(): string {
  return 'Use Tab to navigate between suggestions, Enter or Space to expand/collapse, and arrow keys to navigate within expanded suggestions.';
}

/**
 * Generate screen reader announcement for suggestion state changes
 */
export function getSuggestionStateAnnouncement(
  action: 'expanded' | 'collapsed' | 'accepted' | 'rejected' | 'deleted',
  suggestion: Suggestion
): string {
  const typeNames = {
    llm: 'writing enhancement',
    brand: 'brand guidelines',
    fact: 'fact check',
    grammar: 'grammar',
    spelling: 'spelling'
  };

  const typeName = typeNames[suggestion.type];

  switch (action) {
    case 'expanded':
      return `${typeName} suggestion expanded. ${suggestion.reason || 'No additional details available.'}`;
    case 'collapsed':
      return `${typeName} suggestion collapsed.`;
    case 'accepted':
      return `${typeName} suggestion accepted and applied.`;
    case 'rejected':
      return `${typeName} suggestion rejected.`;
    case 'deleted':
      return `${typeName} suggestion deleted.`;
    default:
      return '';
  }
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ];

  return focusableSelectors.some(selector => element.matches(selector));
}

/**
 * Get the next focusable element in a container
 */
export function getNextFocusableElement(
  container: HTMLElement,
  currentElement: HTMLElement,
  direction: 'next' | 'previous' = 'next'
): HTMLElement | null {
  const focusableElements = container.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
  );

  const elements = Array.from(focusableElements) as HTMLElement[];
  const currentIndex = elements.indexOf(currentElement);

  if (currentIndex === -1) return null;

  const nextIndex = direction === 'next'
    ? (currentIndex + 1) % elements.length
    : (currentIndex - 1 + elements.length) % elements.length;

  return elements[nextIndex] || null;
}

/**
 * Announce text to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
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
}

/**
 * Manage focus for suggestion interactions
 */
export class SuggestionFocusManager {
  private container: HTMLElement;
  private focusHistory: HTMLElement[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Save current focus for restoration later
   */
  saveFocus(): void {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && this.container.contains(activeElement)) {
      this.focusHistory.push(activeElement);
    }
  }

  /**
   * Restore previously saved focus
   */
  restoreFocus(): void {
    const lastFocused = this.focusHistory.pop();
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus();
    }
  }

  /**
   * Focus the first focusable element in container
   */
  focusFirst(): void {
    const firstFocusable = this.container.querySelector(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    ) as HTMLElement;

    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  /**
   * Focus a specific suggestion by ID
   */
  focusSuggestion(suggestionId: string): void {
    const suggestionElement = this.container.querySelector(
      `[data-suggestion-id="${suggestionId}"]`
    ) as HTMLElement;

    if (suggestionElement) {
      suggestionElement.focus();
    }
  }
}
