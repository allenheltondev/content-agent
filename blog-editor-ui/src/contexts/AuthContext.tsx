import { createContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, signInWithRedirect, signOut, fetchAuthSession } from 'aws-amplify/auth';
import type { AuthContextType, CognitoUser } from '../types';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      const currentUser = await getCurrentUser();

      if (currentUser) {
        const cognitoUser: CognitoUser = {
          username: currentUser.username,
          attributes: {
            email: currentUser.signInDetails?.loginId || '',
            sub: currentUser.userId,
            name: currentUser.signInDetails?.loginId || currentUser.username,
          },
        };

        setUser(cognitoUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.log('No authenticated user found:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await signInWithRedirect();
      // Note: After redirect, the page will reload and checkAuthState will be called
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);

      // Provide more specific error messages
      if (error instanceof Error) {
        throw new Error(`Authentication failed: ${error.message}`);
      } else {
        throw new Error('Authentication failed. Please try again.');
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Clear local state immediately
      setUser(null);
      setIsAuthenticated(false);

      // Clear any local storage items
      localStorage.removeItem('auth_token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('draft_content_')) {
          localStorage.removeItem(key);
        }
      });

      // Sign out from Cognito
      await signOut();

    } catch (error) {
      console.error('Logout error:', error);
      // Even if signOut fails, we've cleared local state
      // Don't throw error to prevent UI issues
    } finally {
      setIsLoading(false);
    }
  };

  const getToken = async (): Promise<string> => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Failed to get authentication token');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    getToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
