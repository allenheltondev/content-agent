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
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPersistedAuth, setHasPersistedAuth] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('auth_state');
    } catch {
      return false;
    }
  });

  // Enhanced flow management state
  const [authFlowState, setAuthFlowState] = useState<AuthFlowState>('idle');
  const [pendingEmail, setPendingEmailState] = useState<string | null>(null);

  // Enhanced resend tracking state
  const [resendAttempts, setResendAttempts] = useState(0);
  const [lastResendTime, setLastResendTime] = useState<number | null>(null);
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number | null>(null);

  // Token refresh management
  const [tokenRefreshInterval, setTokenRefreshInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [lastTokenRefresh, setLastTokenRefresh] = useState<number | null>(null);

  // Authentication persistence functions
  const persistAuthState = (authUser: CognitoUser, tokens: any) => {
    try {
      const authState = {
        user: authUser,
        isAuthenticated: true,
        tokens: {
          accessToken: tokens.accessToken?.toString(),
          idToken: tokens.idToken?.toString(),
          refreshToken: tokens.refreshToken?.toString(),
          expiresAt: tokens.idToken?.payload?.exp ? tokens.idToken.payload.exp * 1000 : null,
        },
        lastRefresh: Date.now(),
        persistedAt: Date.now(),
        version: '1.0', // Version for future compatibility
      };
      localStorage.setItem('auth_state', JSON.stringify(authState));
      setHasPersistedAuth(true);
      console.log('Auth state persisted to localStorage with expiry:', new Date(authState.tokens.expiresAt || 0));
    } catch (error) {
      console.error('Failed to persist auth state:', error);
      // If localStorage is full or unavailable, clear old data and try again
      try {
        localStorage.removeItem('auth_state');
        const retryAuthState = {
          user: authUser,
          isAuthenticated: true,
          tokens: {
            accessToken: tokens.accessToken?.toString(),
            idToken: tokens.idToken?.toString(),
            refreshToken: tokens.refreshToken?.toString(),
            expiresAt: tokens.idToken?.payload?.exp ? tokens.idToken.payload.exp * 1000 : null,
          },
          lastRefresh: Date.now(),
          persistedAt: Date.now(),
          version: '1.0',
        };
        localStorage.setItem('auth_state', JSON.stringify(retryAuthState));
        setHasPersistedAuth(true);
        console.log('Auth state persisted after clearing old data');
      } catch (retryError) {
        console.error('Failed to persist auth state even after cleanup:', retryError);
      }
    }
  };

  const restoreAuthState = (): { user: CognitoUser; tokens: any } | null => {
    try {
      const storedState = localStorage.getItem('auth_state');
      if (!storedState) {
        console.log('No stored auth state found');
        return null;
      }

      const authState = JSON.parse(storedState);

      // Validate the structure of stored state
      if (!authState.user || !authState.tokens || !authState.persistedAt) {
        console.log('Invalid stored auth state structure, clearing');
        localStorage.removeItem('auth_state');
        return null;
      }

      // Check if stored state is too old (more than 7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      if (Date.now() - authState.persistedAt > maxAge) {
        console.log('Stored auth state is too old, clearing');
        localStorage.removeItem('auth_state');
        return null;
      }

      // Check if tokens are expired (with 5-minute buffer)
      const fiveMinutes = 5 * 60 * 1000;
      if (authState.tokens.expiresAt && (Date.now() + fiveMinutes) > authState.tokens.expiresAt) {
        console.log('Stored tokens are expired or will expire soon, will attempt refresh');
      }

      console.log('Successfully restored auth state from localStorage');
      return {
        user: authState.user,
        tokens: authState.tokens,
      };
    } catch (error) {
      console.error('Failed to restore auth state:', error);
      localStorage.removeItem('auth_state');
      return null;
    }
  };

  const clearPersistedAuthState = () => {
    try {
      localStorage.removeItem('auth_state');
      setHasPersistedAuth(false);
      console.log('Persisted auth state cleared');
    } catch (error) {
      console.error('Failed to clear persisted auth state:', error);
    }
  };

  const refreshTokensWithRetry = async (maxRetries = 3): Promise<any> => {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Token refresh attempt ${attempt}/${maxRetries}`);

        // Check network connectivity before attempting refresh
        if (!navigator.onLine) {
          throw new Error('Network offline, cannot refresh tokens');
        }

        const session = await fetchAuthSession({ forceRefresh: true });

        if (!session.tokens?.accessToken || !session.tokens?.idToken) {
          throw new Error('Refresh returned invalid tokens');
        }

        // Validate token expiry
        const tokenExpiry = session.tokens.idToken?.payload?.exp;
        const now = Math.floor(Date.now() / 1000);

        if (tokenExpiry && tokenExpiry <= now) {
          throw new Error('Refreshed tokens are already expired');
        }

        console.log('Token refresh successful, expires at:', new Date((tokenExpiry || 0) * 1000));
        return session;
      } catch (error) {
        lastError = error;
        console.error(`Token refresh attempt ${attempt} failed:`, error);

        // Check if this is a network error that we should retry
        const authError = AuthErrorHandler.processError(error, 'refreshTokens');

        // Don't retry if it's the last attempt or error is not retryable
        if (!authError.retryable || attempt === maxRetries) {
          console.error('Token refresh failed permanently:', authError);
          throw error;
        }

        // Wait before retrying (exponential backoff with jitter)
        const baseDelay = 1000 * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 1000; // Add randomness to prevent thundering herd
        const delay = Math.min(baseDelay + jitter, 15000); // Cap at 15 seconds

        console.log(`Waiting ${Math.round(delay)}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  };

  // Check if user is authenticated on mount
  useEffect(() => {
    console.log('AuthProvider mounted, checking auth state...');
    checkAuthState()
      .catch((e) => console.error('Initial auth check failed:', e))
      .finally(() => setIsInitialized(true));

    // Cleanup function for component unmount
    return () => {
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
      }
      // Cleanup handled by React's cleanup
    };
  }, []);

  // Set up periodic token refresh to prevent expiration
  useEffect(() => {
    // Clear existing interval
    if (tokenRefreshInterval) {
      clearInterval(tokenRefreshInterval);
      setTokenRefreshInterval(null);
    }

    if (!isAuthenticated) return;

    // Refresh tokens every 45 minutes (tokens expire after 1 hour)
    const refreshInterval = setInterval(async () => {
      try {
        // Skip refresh if user is not active (tab is hidden and hasn't been active for 10+ minutes)
        const tenMinutes = 10 * 60 * 1000;
        const isTabHidden = document.hidden;
        const timeSinceLastRefresh = lastTokenRefresh ? Date.now() - lastTokenRefresh : 0;

        if (isTabHidden && timeSinceLastRefresh > tenMinutes) {
          console.log('Skipping periodic refresh - tab inactive for too long');
          return;
        }

        console.log('Periodic token refresh starting...');
        const session = await refreshTokensWithRetry();

        if (session.tokens && user) {
          // Update persisted state with new tokens
          persistAuthState(user, session.tokens);
          setLastTokenRefresh(Date.now());
          console.log('Periodic token refresh successful');
        }
      } catch (error) {
        console.error('Periodic token refresh failed:', error);

        // Check if this is a recoverable error
        const authError = AuthErrorHandler.processError(error, 'periodicRefresh');

        if (authError.retryable) {
          console.log('Token refresh failed but retryable, will try again next cycle');

          // For network errors, try again in 5 minutes instead of waiting full cycle
          if (authError.type === 'network') {
            setTimeout(async () => {
              try {
                console.log('Retrying token refresh after network error...');
                const retrySession = await refreshTokensWithRetry(1); // Single retry
                if (retrySession.tokens && user) {
                  persistAuthState(user, retrySession.tokens);
                  setLastTokenRefresh(Date.now());
                  console.log('Token refresh retry successful');
                }
              } catch (retryError) {
                console.error('Token refresh retry failed:', retryError);
              }
            }, 5 * 60 * 1000); // 5 minutes

            // Timeout will be cleaned up by React
          }
        } else {
          console.log('Token refresh failed with non-retryable error, checking auth state');
          // If refresh fails with non-retryable error, check auth state to handle logout
          await checkAuthState(true); // Skip persistence check since we know there's an issue
        }
      }
    }, 45 * 60 * 1000); // 45 minutes

    setTokenRefreshInterval(refreshInterval);

    // Interval will be cleaned up by React

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated, user]);

  // Refresh tokens when user returns to the tab/window
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        try {
          console.log('Tab became visible, checking token validity...');

          // Check if it's been more than 5 minutes since last refresh
          const fiveMinutes = 5 * 60 * 1000;
          const shouldRefresh = !lastTokenRefresh || (Date.now() - lastTokenRefresh > fiveMinutes);

          if (shouldRefresh) {
            const session = await refreshTokensWithRetry();

            if (session.tokens && user) {
              persistAuthState(user, session.tokens);
              setLastTokenRefresh(Date.now());
              console.log('Token refresh on visibility change successful');
            }
          } else {
            console.log('Skipping token refresh, recent refresh detected');
          }
        } catch (error) {
          console.error('Failed to refresh tokens on visibility change:', error);

          // Check if this is a recoverable error
          const authError = AuthErrorHandler.processError(error, 'visibilityRefresh');

          if (!authError.retryable) {
            console.log('Non-retryable error on visibility change, checking auth state');
            await checkAuthState(true);
          }
        }
      }
    };

    // Also handle online/offline events for network recovery
    const handleOnline = async () => {
      if (isAuthenticated) {
        console.log('Network connection restored, validating auth state...');
        try {
          // Quick validation without forcing refresh
          await fetchAuthSession({ forceRefresh: false });
        } catch (error) {
          console.log('Auth validation failed after network restore, checking state');
          await checkAuthState(true);
        }
      }
    };

    // Event listeners will be cleaned up by React
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated, lastTokenRefresh, user]);

  const checkAuthState = async (skipPersistenceCheck = false) => {
    try {
      setIsLoading(true);
      console.log('Checking auth state...', { skipPersistenceCheck });

      let session;
      let currentUser;

      // First, try to restore from localStorage if not skipping
      if (!skipPersistenceCheck) {
        const restoredState = restoreAuthState();
        if (restoredState) {
          setHasPersistedAuth(true);
          console.log('Found persisted auth state, validating...');

          try {
            // Validate the restored state by checking current session
            session = await fetchAuthSession({ forceRefresh: false });

            if (session.tokens?.accessToken && session.tokens?.idToken) {
              // Check if tokens are still valid (with 5-minute buffer)
              const now = Math.floor(Date.now() / 1000);
              const tokenExpiry = session.tokens.idToken?.payload?.exp;
              const fiveMinutes = 5 * 60;

              if (tokenExpiry && (tokenExpiry - now) > fiveMinutes) {
                // Tokens are valid with buffer, restore user state immediately
                setUser(restoredState.user);
                setIsAuthenticated(true);
                setAuthFlowState('authenticated');
                setLastTokenRefresh(Date.now());
                console.log('Successfully restored auth state from localStorage');
                return;
              } else if (tokenExpiry && tokenExpiry > now) {
                // Tokens are valid but will expire soon, restore state and refresh in background
                setUser(restoredState.user);
                setIsAuthenticated(true);
                setAuthFlowState('authenticated');
                setLastTokenRefresh(Date.now());
                console.log('Restored auth state, will refresh tokens in background');

                // Refresh tokens in background without blocking UI
                setTimeout(async () => {
                  try {
                    const refreshedSession = await refreshTokensWithRetry();
                    if (refreshedSession.tokens && restoredState.user) {
                      persistAuthState(restoredState.user, refreshedSession.tokens);
                      setLastTokenRefresh(Date.now());
                      console.log('Background token refresh successful');
                    }
                  } catch (error) {
                    console.error('Background token refresh failed:', error);
                  }
                }, 100);

                return;
              } else {
                console.log('Restored tokens are expired, attempting refresh...');
              }
            }
          } catch (restoreError) {
            console.log('Failed to validate restored state, proceeding with fresh check:', restoreError);
          }
        }
      }

      // Get fresh session from Cognito
      console.log('Fetching fresh auth session...');
      session = await fetchAuthSession({ forceRefresh: false });
      console.log('Session fetched:', {
        hasAccessToken: !!session.tokens?.accessToken,
        hasIdToken: !!session.tokens?.idToken
      });

      // Check if we have valid tokens
      if (!session.tokens?.accessToken || !session.tokens?.idToken) {
        throw new Error('No valid tokens found in session');
      }

      // Check if tokens are expired
      const now = Math.floor(Date.now() / 1000);
      const tokenExpiry = session.tokens.idToken?.payload?.exp;

      console.log('Token expiry check:', {
        tokenExpiry,
        currentTime: now,
        isExpired: tokenExpiry ? tokenExpiry < now : 'unknown'
      });

      if (tokenExpiry && tokenExpiry < now) {
        console.log('Tokens expired, attempting refresh...');
        try {
          // Try to refresh tokens with retry logic
          session = await refreshTokensWithRetry();
          console.log('Tokens refreshed successfully');
        } catch (refreshError) {
          console.error('Failed to refresh expired tokens:', refreshError);
          throw new Error('Failed to refresh expired tokens');
        }
      }

      // Now try to get current user
      console.log('Getting current user...');
      currentUser = await getCurrentUser();
      console.log('Current user retrieved:', {
        username: currentUser?.username,
        userId: currentUser?.userId
      });

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
        setLastTokenRefresh(Date.now());

        // Persist the successful auth state
        persistAuthState(cognitoUser, session.tokens);

        console.log('User authenticated successfully');
      } else {
        console.log('Missing user or tokens, setting unauthenticated state');
        clearPersistedAuthState();
        setUser(null);
        setIsAuthenticated(false);
        // Only reset to idle if not in a registration flow
        if (authFlowState !== 'confirming') {
          setAuthFlowState('idle');
        }
      }
    } catch (error) {
      console.log('Auth state check failed:', error);

      // Use enhanced error handling for logging purposes
      const authError = AuthErrorHandler.processError(error, 'checkAuthState');
      console.log('Processed auth state error:', authError);

      // Handle network errors differently - don't clear state immediately
      if (authError.type === 'network' && authError.retryable) {
        console.log('Network error during auth check, will retry but keep current state if available');

        // If we have a persisted state, try to use it temporarily
        const restoredState = restoreAuthState();
        if (restoredState && !skipPersistenceCheck) {
          console.log('Using persisted state during network error');
          setUser(restoredState.user);
          setIsAuthenticated(true);
          setAuthFlowState('authenticated');
          setLastTokenRefresh(Date.now());

          // Schedule a retry in 30 seconds
          setTimeout(() => {
            console.log('Retrying auth state check after network error');
            checkAuthState(false);
          }, 30000);

          return;
        }
      }

      // For non-network errors or when no persisted state is available, clear everything
      clearPersistedAuthState();
      setUser(null);
      setIsAuthenticated(false);
      setLastTokenRefresh(null);

      // Only reset to idle if not in a registration flow
      if (authFlowState !== 'confirming') {
        setAuthFlowState('idle');
      }
    } finally {
      setIsLoading(false);
      console.log('Auth state check completed');
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
        // Get fresh session and user data
        const session = await fetchAuthSession({ forceRefresh: false });
        const currentUser = await getCurrentUser();

        if (currentUser && session.tokens) {
          const cognitoUser: CognitoUser = {
            username: currentUser.username,
            attributes: {
              email: currentUser.signInDetails?.loginId || email,
              sub: currentUser.userId,
              name: currentUser.signInDetails?.loginId || currentUser.username,
            },
          };

          setUser(cognitoUser);
          setIsAuthenticated(true);
          setAuthFlowState('authenticated');
          setLastTokenRefresh(Date.now());

          // Persist the successful auth state
          persistAuthState(cognitoUser, session.tokens);

          console.log('Login successful, auth state persisted');
        } else {
          throw new Error('Failed to retrieve user data after login');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);

      // Clear any invalid persisted state
      clearPersistedAuthState();

      // Use enhanced error handling
      const authError = AuthErrorHandler.processError(error, 'login');
      console.error('Processed login error:', authError);

      // Throw user-friendly error message
      throw new Error(AuthErrorHandler.formatErrorMessage(authError, 'Login failed'));
    } finally {
      setIsLoading(false);
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

      // Clear token refresh interval
      if (tokenRefreshInterval) {
        clearInterval(tokenRefreshInterval);
        setTokenRefreshInterval(null);
      }

      // Clear local state immediately
      setUser(null);
      setIsAuthenticated(false);
      setAuthFlowState('idle');
      setPendingEmailState(null);
      setLastTokenRefresh(null);

      // Clear persisted auth state
      clearPersistedAuthState();

      // Clear any other local storage items
      localStorage.removeItem('auth_token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('draft_content_')) {
          localStorage.removeItem(key);
        }
      });

      // Sign out from Cognito
      await signOut();
      console.log('Logout successful');

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
      // First try to get current session without forcing refresh
      let session = await fetchAuthSession({ forceRefresh: false });

      // Check if token is expired or will expire soon (within 5 minutes)
      const now = Math.floor(Date.now() / 1000);
      const tokenExpiry = session.tokens?.idToken?.payload?.exp;
      const fiveMinutes = 5 * 60; // 5 minutes in seconds

      const needsRefresh = !session.tokens?.accessToken ||
                          !tokenExpiry ||
                          (tokenExpiry - now) < fiveMinutes;

      if (needsRefresh) {
        console.log('Token needs refresh, attempting refresh...');
        session = await refreshTokensWithRetry();

        if (session.tokens && user) {
          // Update persisted state with new tokens
          persistAuthState(user, session.tokens);
          setLastTokenRefresh(Date.now());
        }
      }

      const token = session.tokens?.accessToken?.toString();

      if (!token) {
        throw new Error('No authentication token available');
      }

      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);

      // Use enhanced error handling
      const authError = AuthErrorHandler.processError(error, 'getToken');
      console.error('Processed token error:', authError);

      // If token refresh fails with non-retryable error, user needs to log in again
      if (!authError.retryable) {
        console.log('Non-retryable token error, clearing auth state');
        clearPersistedAuthState();
        setUser(null);
        setIsAuthenticated(false);
        setAuthFlowState('idle');
        setLastTokenRefresh(null);
      }

      // Throw user-friendly error message
      throw new Error(AuthErrorHandler.formatErrorMessage(authError, 'Failed to get authentication token'));
    }
  };



  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isInitialized,
    hasPersistedAuth,
    authFlowState,
    pendingEmail,
    lastTokenRefresh,
    login,
    logout,
    getToken,
    register,
    confirmRegistration,
    resendConfirmationCode,
    resetAuthFlow,
    setPendingEmail,
    persistAuthState,
    restoreAuthState,
    clearPersistedAuthState,
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
