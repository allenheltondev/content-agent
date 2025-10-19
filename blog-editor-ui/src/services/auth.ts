import { getCurrentUser, signInWithRedirect, signOut, fetchAuthSession } from 'aws-amplify/auth';
import type { CognitoUser } from '../types';

export class AuthService {
  /**
   * Get the current authenticated user
   */
  static async getCurrentUser(): Promise<CognitoUser | null> {
    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        return null;
      }

      return {
        username: currentUser.username,
        attributes: {
          email: currentUser.signInDetails?.loginId || '',
          sub: currentUser.userId,
          name: currentUser.signInDetails?.loginId || currentUser.username,
        },
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Sign in with Cognito Hosted UI
   */
  static async signIn(): Promise<void> {
    try {
      await signInWithRedirect();
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error('Failed to sign in');
    }
  }

  /**
   * Sign out the current user
   */
  static async signOut(): Promise<void> {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get the current authentication token
   */
  static async getAuthToken(): Promise<string> {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Failed to get authentication token');
    }
  }

  /**
   * Check if the user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const user = await this.getCurrentUser();
      return user !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get user attributes from the current session
   */
  static async getUserAttributes(): Promise<Record<string, string> | null> {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;

      if (!idToken) {
        return null;
      }

      // Extract claims from the ID token
      return idToken.payload as Record<string, string>;
    } catch {
      console.error('Error getting user attributes');
      return null;
    }
  }
}
