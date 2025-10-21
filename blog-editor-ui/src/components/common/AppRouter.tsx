import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { LoginPage } from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';
import { EditorPage } from '../../pages/EditorPage';
import { ProfileSetupPage } from '../../pages/ProfileSetupPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { AboutMyWritingPage } from '../../pages/AboutMyWritingPage';
import { LoadingSpinner } from './LoadingSpinner';
import { ProtectedRoute } from './ProtectedRoute';

// Component to handle root route with query parameter preservation
const RootRedirect = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { isProfileComplete } = useProfile();

  // Determine the default redirect destination based on authentication state
  const getDefaultRedirect = () => {
    if (!isAuthenticated) return "/login";
    if (!isProfileComplete) return "/profile-setup";
    return "/dashboard";
  };

  // Preserve query parameters and hash from the original URL
  const redirectPath = getDefaultRedirect();
  const preservedSearch = location.search;
  const preservedHash = location.hash;
  const fullRedirectPath = `${redirectPath}${preservedSearch}${preservedHash}`;

  return <Navigate to={fullRedirectPath} replace />;
};

export const AppRouter = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { isProfileComplete, isCheckingProfile } = useProfile();

  // Show loading spinner while checking authentication or profile
  if (isLoading || isCheckingProfile) {
    return <LoadingSpinner />;
  }

  // Determine the default redirect destination for authenticated users
  const getDefaultRedirect = () => {
    if (!isAuthenticated) return "/login";
    if (!isProfileComplete) return "/profile-setup";
    return "/dashboard";
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to={getDefaultRedirect()} replace /> : <LoginPage />
          }
        />

        {/* Profile setup route - requires authentication but not profile completion */}
        <Route
          path="/profile-setup"
          element={
            isAuthenticated && isProfileComplete ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <ProtectedRoute requireProfileComplete={false}>
                <ProfileSetupPage />
              </ProtectedRoute>
            )
          }
        />

        {/* Profile editing route - requires authentication and profile completion */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* About My Writing route - requires authentication and profile completion */}
        <Route
          path="/about-my-writing"
          element={
            <ProtectedRoute>
              <AboutMyWritingPage />
            </ProtectedRoute>
          }
        />

        {/** Debug route removed for demo cleanup */}

        {/* Protected routes that require both authentication and profile completion */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        {/* Use dynamic route for both existing and new posts (id='new') */}
        <Route
          path="/editor/:id"
          element={
            <ProtectedRoute>
              <EditorPage />
            </ProtectedRoute>
          }
        />

        {/* Root route with query parameter preservation */}
        <Route
          path="/"
          element={<RootRedirect />}
        />

        {/* Catch all route */}
        <Route
          path="*"
          element={<Navigate to={getDefaultRedirect()} replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};
