import { useEffect } from 'react';

/**
 * Custom hook for managing page titles with Betterer branding
 * Sets document.title to "[Page Name] | Betterer" format
 *
 * @param pageTitle - The name of the current page
 */
export const usePageTitle = (pageTitle: string): void => {
  useEffect(() => {
    if (pageTitle) {
      document.title = `${pageTitle} | Betterer`;
    } else {
      document.title = 'Betterer';
    }

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = 'Betterer';
    };
  }, [pageTitle]);
};
