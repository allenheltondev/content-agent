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
  const { isAuthenticated, isLoading } = useAuth();
  const { isProfileComplete, isCheckingProfile } = useProfile();

  // Show loading spinner while checking authentication or profile
  if (isLoading || isCheckingProfile) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to profile setup if profile is required but incomplete
  if (requireProfileComplete && !isProfileComplete) {
    return <Navigate to="/profile-setup" replace />;
  }

  return <>{children}</>;
};
