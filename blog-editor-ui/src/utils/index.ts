import { SuggestionType } from '../types';

// Debounce utility for auto-save functionality
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Format date utility
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get suggestion color classes based on type
export function getSuggestionColors(type: SuggestionType): {
  bg: string;
  border: string;
} {
  const colorMap = {
    llm: { bg: 'bg-blue-200', border: 'border-blue-400' },
    brand: { bg: 'bg-purple-200', border: 'border-purple-400' },
    fact: { bg: 'bg-orange-200', border: 'border-orange-400' },
    grammar: { bg: 'bg-green-200', border: 'border-green-400' },
    spelling: { bg: 'bg-red-200', border: 'border-red-400' },
  };

  return colorMap[type];
}

// Local storage utilities
export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  },
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },
  remove: (key: string): void => {
    localStorage.removeItem(key);
  },
};
