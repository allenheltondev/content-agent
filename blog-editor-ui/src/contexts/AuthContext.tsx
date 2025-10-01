import { createContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, signIn, signOut, fetchAuthSession, signUp, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import type { AuthContextType, CognitoUser, AuthFlowState, AuthError } from '../types';
import { AuthErrorHandler } from '../utils/authErrorHandler';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<CognitoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Enhanced flow management state
  const [authFlowState, setAuthFlowState] = useState<AuthFlowState>('idle');
  const [pendingEmail, setPendingEmailState] = useState<string | null>(null);

  // Enhanced resend tracking state
  const [resendAttempts, setResendAttempts] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<number | null>(null);
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number | null>(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);

      // Check both user and session to ensure user is fully authenticated
      const [currentUser, session] = await Promise.all([
        getCurrentUser(),
        fetchAuthSession()
      ]);

      if (currentUser && session.tokens) {
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
        setAuthFlowState('authenticated');
      } else {
        setUser(null);
        setIsAuthenticated(false);
        // Only reset to idle if not in a registration flow
        if (authFlowState !== 'confirming') {
          setAuthFlowState('idle');
        }
      }
    } catch (error) {
      console.log('No authenticated user found:', error);

      // Use enhanced error handling for logging purposes
      const authError = AuthErrorHandler.processError(error, 'checkAuthState');
      console.log('Processed auth state error:', authError);

      setUser(null);
      setIsAuthenticated(false);
      // Only reset to idle if not in a registration flow
      if (authFlowState !== 'confirming') {
        setAuthFlowState('idle');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      const result = await signIn({
        username: email,
        password: password,
      });

      if (result.isSignedIn) {
        await checkAuthState();
        setAuthFlowState('authenticated');
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);

      // Use enhanced error handling
      const authError = AuthErrorHandler.processError(error, 'login');
      console.error('Processed login error:', authError);

      // Throw user-friendly error message
      throw new Error(AuthErrorHandler.formatErrorMessage(authError, 'Login failed'));
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{
    isSignUpComplete: boolean;
    nextStep?: any;
  }> => {
    try {
      setIsLoading(true);
      setAuthFlowState('registering');
      console.log('Calling signUp with:', { email, name });

      const result = await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
            name: name,
          },
        },
      });

      console.log('signUp successful');

      // Set flow state to confirming and store pending email
      setAuthFlowState('confirming');
      setPendingEmailState(email);
      setIsLoading(false);

      return {
        isSignUpComplete: result.isSignUpComplete,
        nextStep: result.nextStep
      };
    } catch (error) {
      console.error('Registration error:', error);
      setIsLoading(false);
      setAuthFlowState('idle');

      // Use enhanced error handling
      const authError = AuthErrorHandler.processError(error, 'register');
      console.error('Processed registration error:', authError);

      // Handle specific recovery strategies
      if (authError.code === 'UsernameExistsException' || authError.code === 'UserAlreadyExistsException') {
        // For existing users, we might want to trigger a different flow
        console.log('User already exists, suggesting login flow');
      }

      // Throw user-friendly error message
      throw new Error(AuthErrorHandler.formatErrorMessage(authError, 'Registration failed'));
    }
  };

  const confirmRegistration = async (email: string, code: string): Promise<void> => {
    try {
      setIsLoading(true);
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      });

      // After successful confirmation, check auth state to update user
      await checkAuthState();

      // Clear pending email and reset flow state
      setPendingEmailState(null);
      setAuthFlowState('authenticated');
      setIsLoading(false);
    } catch (error) {
      console.error('Confirmation error:', error);
      setIsLoading(false);

      // Use enhanced error handling
      const authError = AuthErrorHandler.processError(error, 'confirmRegistration');
      console.error('Processed confirmation error:', authError);

      // Handle automatic resend for expired codes
      if (AuthErrorHandler.shouldAutoResend(authError)) {
        console.log('Auto-resending confirmation code due to expiration');
        try {
          await resendSignUpCode({ username: email });
          console.log('Confirmation code automatically resent');
        } catch (resendError) {
          console.error('Failed to auto-resend confirmation code:', resendError);
        }
      }

      // Throw user-friendly error message
      throw new Error(AuthErrorHandler.formatErrorMessage(authError, 'Confirmation failed'));
    }
  };

  const resendConfirmationCode = async (email: string): Promise<{
    success: boolean;
    message: string;
    cooldownUntil?: number;
    attemptsRemaining?: number;
  }> => {
    try {
      // Check if we're in cooldown period
      const now = Date.now();
      if (resendCooldownUntil && now < resendCooldownUntil) {
        const remainingSeconds = Math.ceil((resendCooldownUntil - now) / 1000);
        throw new Error(`Please wait ${remainingSeconds} seconds before requesting another code.`);
      }

      setIsLoading(true);
      await resendSignUpCode({
        username: email,
      });

      // Update resend tracking
      const newAttempts = resendAttempts + 1;
      const newLastResendTime = now;
      setResendAttempts(newAttempts);
      setLastResendTime(newLastResendTime);

      // Implement progressive cooldown based on attempts
      let cooldownDuration = 0;
      if (newAttempts >= 3) {
        cooldownDuration = 300000; // 5 minutes after 3+ attempts
      } else if (newAttempts >= 2) {
        cooldownDuration = 120000; // 2 minutes after 2+ attempts
      } else {
        cooldownDuration = 30000; // 30 seconds for first attempt
      }

      const cooldownUntil = now + cooldownDuration;
      setResendCooldownUntil(cooldownUntil);

      setIsLoading(false);

      return {
        success: true,
        message: `Confirmation code sent! You can request another code in ${Math.ceil(cooldownDuration / 1000)} seconds.`,
        cooldownUntil,
        attemptsRemaining: Math.max(0, 5 - newAttempts) // Allow up to 5 attempts
      };
    } catch (error) {
      console.error('Resend confirmation code error:', error);
      setIsLoading(false);

      // Use enhanced error handling
      const authError = AuthErrorHandler.processError(error, 'resendConfirmationCode');
      console.error('Processed resend error:', authError);

      // Handle rate limiting with specific cooldown
      const retryDelay = AuthErrorHandler.getRetryDelay(authError);
      if (retryDelay > 0) {
        const cooldownUntil = Date.now() + retryDelay;
        setResendCooldownUntil(cooldownUntil);
        console.log(`Rate limited by service, cooldown until: ${new Date(cooldownUntil)}`);
      }

      // Return error result instead of throwing
      return {
        success: false,
        message: AuthErrorHandler.formatErrorMessage(authError, 'Failed to resend confirmation code'),
        cooldownUntil: retryDelay > 0 ? Date.now() + retryDelay : undefined
      };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Clear local state immediately
      setUser(null);
      setIsAuthenticated(false);
      setAuthFlowState('idle');
      setPendingEmailState(null);

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

  // New flow management methods
  const resetAuthFlow = (): void => {
    setAuthFlowState('idle');
    setPendingEmailState(null);
    // Reset resend tracking when flow is reset
    setResendAttempts(0);
    setLastResendTime(null);
    setResendCooldownUntil(null);
  };

  const setPendingEmail = (email: string): void => {
    setPendingEmailState(email);
  };

  // Enhanced resend management methods
  const getResendStatus = (): {
    canResend: boolean;
    cooldownRemaining: number;
    attemptsUsed: number;
    nextResendAt?: number;
  } => {
    const now = Date.now();
    const canResend = !resendCooldownUntil || now >= resendCooldownUntil;
    const cooldownRemaining = resendCooldownUntil ? Math.max(0, resendCooldownUntil - now) : 0;

    return {
      canResend,
      cooldownRemaining,
      attemptsUsed: resendAttempts,
      nextResendAt: resendCooldownUntil || undefined
    };
  };

  const shouldSuggestResend = (): boolean => {
    // Suggest resend if it's been more than 2 minutes since last resend
    // and user hasn't exceeded attempt limits
    if (!lastResendTime || resendAttempts >= 5) return false;

    const timeSinceLastResend = Date.now() - lastResendTime;
    const twoMinutes = 2 * 60 * 1000;

    return timeSinceLastResend > twoMinutes;
  };

  // Enhanced error recovery methods
  const handleAuthError = (error: unknown, operation: string): AuthError => {
    return AuthErrorHandler.processError(error, operation);
  };

  const canRetryOperation = (error: AuthError): boolean => {
    return error.retryable;
  };

  const getRetryDelay = (error: AuthError): number => {
    return AuthErrorHandler.getRetryDelay(error);
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

      // Use enhanced error handling
      const authError = AuthErrorHandler.processError(error, 'getToken');
      console.error('Processed token error:', authError);

      // Throw user-friendly error message
      throw new Error(AuthErrorHandler.formatErrorMessage(authError, 'Failed to get authentication token'));
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    authFlowState,
    pendingEmail,
    login,
    logout,
    getToken,
    register,
    confirmRegistration,
    resendConfirmationCode,
    resetAuthFlow,
    setPendingEmail,
    handleAuthError,
    canRetryOperation,
    getRetryDelay,
    getResendStatus,
    shouldSuggestResend,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
