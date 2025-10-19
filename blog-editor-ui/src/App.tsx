import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { AppRouter } from './components/common/AppRouter';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './config/amplify'; // Initialize Amplify configuration
import { initializeApi } from './config/api'; // Initialize API service
import { initializeErrorBoundarySystem } from './utils/errorBoundarySetup';


// Initialize API service
initializeApi();

// Initialize error boundary system
initializeErrorBoundarySystem();



function App() {
  // Initialize skip links functionality
  useEffect(() => {
    const skipLinks = document.querySelectorAll('[data-skip-link]');

    const handleSkipLinkClick = (event: Event) => {
      event.preventDefault();
      const target = (event.target as HTMLAnchorElement).getAttribute('href');
      if (target) {
        const targetElement = document.querySelector(target);
        if (targetElement) {
          (targetElement as HTMLElement).focus();
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    skipLinks.forEach(link => {
      link.addEventListener('click', handleSkipLinkClick);
    });

    return () => {
      skipLinks.forEach(link => {
        link.removeEventListener('click', handleSkipLinkClick);
      });
    };
  }, []);

  return (
    <ErrorBoundary>
      {/* Skip Links for keyboard navigation */}
      <div className="sr-only focus-within:not-sr-only">
        <a
          href="#main-content"
          data-skip-link
          className="absolute top-0 left-0 z-50 px-4 py-2 bg-primary text-white rounded-br-md focus:outline-none focus:ring-2 focus:ring-primary-hover"
        >
          Skip to main content
        </a>
        <a
          href="#main-navigation"
          data-skip-link
          className="absolute top-0 left-32 z-50 px-4 py-2 bg-primary text-white rounded-br-md focus:outline-none focus:ring-2 focus:ring-primary-hover"
        >
          Skip to navigation
        </a>
      </div>

      <ToastProvider>
        <AuthProvider>
          <ProfileProvider>
            <AppRouter />
          </ProfileProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
