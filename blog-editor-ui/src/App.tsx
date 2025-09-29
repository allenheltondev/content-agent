import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppRouter } from './components/common/AppRouter';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './config/amplify'; // Initialize Amplify configuration
import { initializeApi } from './config/api'; // Initialize API service

// Initialize API service
initializeApi();

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
