import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { AppRouter } from './components/common/AppRouter';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useSkipLinks } from './hooks/useKeyboardNavigation';
import './config/amplify'; // Initialize Amplify configuration
import { initializeApi } from './config/api'; // Initialize API service
import { initializeErrorBoundarySystem } from './utils/errorBoundarySetup';
import { editorIntegrationManager } from './utils/editorIntegrationManager';

// Initialize API service
initializeApi();

// Initialize error boundary system
initializeErrorBoundarySystem();

// Initialize editor integration manager
editorIntegrationManager; // This initializes the singleton

function App() {
  // Initialize skip links functionality
  useSkipLinks();

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
