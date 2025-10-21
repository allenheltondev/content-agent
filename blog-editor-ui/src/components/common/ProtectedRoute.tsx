import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { LoadingSpinner } from './LoadingSpinner';
import type { ProtectedRouteProps } from '../../types';

interface ProtectedRouteConfig extends ProtectedRouteProps {
  requireProfileComplete?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireProfileComplete = true
}: ProtectedRouteConfig) => {
  const { isAuthenticated, isLoading, isInitialized, hasPersistedAuth } = useAuth();
  const { isProfileComplete, isCheckingProfile } = useProfile();

  // Show loading spinner while checking authentication or profile
  if (isLoading || isCheckingProfile || !isInitialized) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated, but if we have persisted auth, hold to avoid premature redirect
  if (!isAuthenticated) {
    if (hasPersistedAuth) {
      return <LoadingSpinner />; // Give Auth another pass to hydrate from persisted state
    }
    return <Navigate to="/login" replace />;
  }

  // Redirect to profile setup if profile is required but incomplete
  if (requireProfileComplete && !isProfileComplete) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <>{children}</>;
};
