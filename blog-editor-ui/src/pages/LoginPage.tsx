import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import { Logo } from '../components/common/Logo';

export const LoginPage = () => {
  const { login, register, confirmRegistration, resendConfirmationCode, isLoading, isAuthenticated, authFlowState, pendingEmail, getResendStatus, shouldSuggestResend } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'confirm'>('login');

  // Enhanced error handling and retry state (requirement 3.2)
  const [lastFailedOperation, setLastFailedOperation] = useState<{
    type: 'login' | 'register' | 'confirm' | 'resend';
    data?: Record<string, unknown>;
    retryCount: number;
  } | null>(null);
  const [showRetryOption, setShowRetryOption] = useState(false);

  // Enhanced resend tracking for automatic suggestions (requirement 3.4)
  const [showAutoResendSuggestion, setShowAutoResendSuggestion] = useState(false);
  const [resendCooldownDisplay, setResendCooldownDisplay] = useState<string>('');
  const [resendFeedbackMessage, setResendFeedbackMessage] = useState<string>('');

  // Enhanced registration step tracking
  const [registrationStep, setRegistrationStep] = useState<'initial' | 'pending-confirmation' | 'confirmed'>('initial');

  // Enhanced form data state with persistence tracking
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmationCode: '',
  });

  // Form data persistence state for navigation between steps (requirement 1.4)
  const [persistedFormData, setPersistedFormData] = useState({
    email: '',
    name: '',
    // Note: password and confirmationCode are intentionally excluded for security
  });

  // Navigation history for proper back navigation (requirement 4.3)
  const [navigationHistory, setNavigationHistory] = useState<Array<{
    mode: 'login' | 'register' | 'confirm';
    timestamp: number;
    preservedData?: Partial<typeof formData>;
  }>>([{ mode: 'login', timestamp: Date.now() }]);
  const navigate = useNavigate();

  // Set page title
  usePageTitle('Sign In');

  // Enhanced form data persistence helper (requirement 1.4)
  const persistNonSensitiveData = useCallback(() => {
    setPersistedFormData({
      email: formData.email,
      name: formData.name,
    });
  }, [formData.email, formData.name]);

  // Enhanced navigation tracking helper (requirement 4.3)
  const addToNavigationHistory = useCallback((newMode: 'login' | 'register' | 'confirm', preserveData = false) => {
    const historyEntry = {
      mode: newMode,
      timestamp: Date.now(),
      preservedData: preserveData ? {
        email: formData.email,
        name: formData.name,
      } : undefined,
    };

    setNavigationHistory(prev => {
      // Keep only last 5 entries to prevent memory issues
      const newHistory = [...prev, historyEntry].slice(-5);
      return newHistory;
    });
  }, [formData.email, formData.name]);

  // Helper function for comprehensive sensitive data cleanup with enhanced security
  const cleanupSensitiveData = (keepFields: string[] = [], isComplete = false) => {
    const sensitiveFields = ['password', 'confirmationCode'];
    const fieldsToClean = sensitiveFields.filter(field => !keepFields.includes(field));

    setFormData(prev => {
      const cleaned = { ...prev };
      fieldsToClean.forEach(field => {
        cleaned[field as keyof typeof cleaned] = '';
      });
      return cleaned;
    });

    // Complete cleanup when registration is finished (requirement 5.1)
    if (isComplete) {
      setPersistedFormData({ email: '', name: '' });
      setNavigationHistory([{ mode: 'login', timestamp: Date.now() }]);

      // Clear any potential browser form data
      setTimeout(() => {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
          if (form.reset) form.reset();
        });
      }, 100);
    }
  };

  // Enhanced back navigation helper (requirement 4.3)
  const canNavigateBack = (): boolean => {
    return navigationHistory.length > 1;
  };

  const navigateBack = () => {
    if (!canNavigateBack()) return;

    const currentHistory = [...navigationHistory];
    const previousEntry = currentHistory[currentHistory.length - 2];

    if (previousEntry) {
      // Remove current entry from history
      setNavigationHistory(prev => prev.slice(0, -1));

      // Restore preserved data if available
      if (previousEntry.preservedData) {
        setFormData(prev => ({
          ...prev,
          email: previousEntry.preservedData?.email || prev.email,
          name: previousEntry.preservedData?.name || prev.name,
          // Keep current password and confirmation code for security
        }));
      }

      // Switch to previous mode
      setMode(previousEntry.mode);
      setError(null);

      console.log('Navigated back to:', previousEntry.mode, 'with preserved data:', previousEntry.preservedData);
    }
  };

  // Helper function to determine if mode switching should be allowed
  const canSwitchMode = (targetMode: 'login' | 'register' | 'confirm'): boolean => {
    // Always allow switching to login (user can always go back)
    if (targetMode === 'login') return true;

    // Allow switching to register only if not in confirmation flow
    if (targetMode === 'register') {
      return authFlowState !== 'confirming' && registrationStep !== 'pending-confirmation';
    }

    // Allow switching to confirm only if in confirmation flow or have pending email
    if (targetMode === 'confirm') {
      return authFlowState === 'confirming' || pendingEmail !== null;
    }

    return true;
  };

  // Enhanced tracking of mode and registration step changes
  useEffect(() => {
    console.log('Mode changed to:', mode, 'registrationStep:', registrationStep);
  }, [mode, registrationStep]);

  // Enhanced sync with AuthContext flow states and email maintenance
  useEffect(() => {
    // Maintain user email throughout the registration flow (requirement 1.2)
    if (pendingEmail) {
      // Always sync form email with pendingEmail from AuthContext when available
      setFormData(prev => ({
        ...prev,
        email: pendingEmail
      }));

      console.log('Email synchronized from AuthContext:', pendingEmail);
    }

    // Enhanced registration step synchronization with AuthContext flow state
    if (authFlowState === 'confirming' && registrationStep === 'initial') {
      console.log('Syncing registration step to pending-confirmation');
      setRegistrationStep('pending-confirmation');
    } else if (authFlowState === 'authenticated' && registrationStep === 'pending-confirmation') {
      console.log('Syncing registration step to confirmed');
      setRegistrationStep('confirmed');
    } else if (authFlowState === 'idle' && registrationStep !== 'initial') {
      console.log('Resetting registration step to initial');
      setRegistrationStep('initial');
    }
  }, [pendingEmail, authFlowState, registrationStep]);



  // Enhanced cleanup on component unmount and registration completion (requirement 5.1)
  useEffect(() => {
    return () => {
      // Complete cleanup when component unmounts
      cleanupSensitiveData([], true);
    };
  }, []);

  // Cleanup when registration is fully complete (requirement 5.1)
  useEffect(() => {
    if (isAuthenticated && authFlowState === 'authenticated' && registrationStep === 'confirmed') {
      console.log('Registration flow complete, performing final cleanup');

      // Delay cleanup to allow for smooth transition
      const cleanupTimer = setTimeout(() => {
        cleanupSensitiveData([], true);
      }, 2000);

      return () => clearTimeout(cleanupTimer);
    }
  }, [isAuthenticated, authFlowState, registrationStep]);

  // Enhanced resend cooldown display and auto-suggestions (requirement 3.4, 5.2)
  useEffect(() => {
    if (mode !== 'confirm') {
      setResendCooldownDisplay('');
      setShowAutoResendSuggestion(false);
      return;
    }

    const updateResendStatus = () => {
      const status = getResendStatus();

      if (!status.canResend && status.cooldownRemaining > 0) {
        // Display rate limiting countdown (requirement 5.2)
        const remainingSeconds = Math.ceil(status.cooldownRemaining / 1000);
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;

        if (minutes > 0) {
          setResendCooldownDisplay(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setResendCooldownDisplay(`${seconds}s`);
        }
        setShowAutoResendSuggestion(false);
      } else {
        setResendCooldownDisplay('');

        // Show automatic resend suggestion (requirement 3.4)
        const shouldSuggest = shouldSuggestResend();
        setShowAutoResendSuggestion(shouldSuggest);
      }
    };

    // Update immediately
    updateResendStatus();

    // Update every second while in confirm mode
    const interval = setInterval(updateResendStatus, 1000);

    return () => clearInterval(interval);
  }, [mode, getResendStatus, shouldSuggestResend]);

  // Enhanced redirection logic that respects registration flow state
  useEffect(() => {
    console.log('Auth state changed:', {
      isAuthenticated,
      mode,
      registrationStep,
      authFlowState
    });

    // Only redirect when user is fully authenticated and not in registration flow
    const shouldRedirect = isAuthenticated &&
                          authFlowState === 'authenticated' &&
                          mode !== 'confirm' &&
                          registrationStep !== 'pending-confirmation';

    if (shouldRedirect) {
      console.log('Redirecting to dashboard - user is fully authenticated');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authFlowState, navigate, mode, registrationStep]);

  // Enhanced mode switching logic with form data persistence and navigation tracking
  const switchMode = useCallback((newMode: 'login' | 'register' | 'confirm', preserveProgress = true) => {
    console.log('switchMode called:', {
      from: mode,
      to: newMode,
      authFlowState,
      registrationStep,
      pendingEmail,
      preserveProgress
    });

    // Persist non-sensitive data before mode switch (requirement 1.4)
    if (preserveProgress) {
      persistNonSensitiveData();
    }

    // Add to navigation history for back navigation (requirement 4.3)
    addToNavigationHistory(newMode, preserveProgress);

    setMode(newMode);
    setError(null);
    setIsSubmitting(false);
    setIsResending(false);

    // Enhanced cleanup and state management for proper registration flow transitions
    if (newMode === 'login') {
      // Clear all sensitive data when going to login
      cleanupSensitiveData();

      // Restore persisted non-sensitive data if available (requirement 1.4)
      if (preserveProgress && persistedFormData.email) {
        setFormData(prev => ({
          ...prev,
          email: persistedFormData.email,
          name: '', // Don't restore name for login
          password: '',
          confirmationCode: ''
        }));
      } else {
        setFormData(prev => ({ ...prev, name: '', password: '', confirmationCode: '' }));
      }

      // Reset registration step when going back to login (requirement 1.1)
      setRegistrationStep('initial');
    } else if (newMode === 'register') {
      // Clear confirmation code when going to register, preserve password for UX
      cleanupSensitiveData(['password']); // Keep password, clear confirmation code

      // Restore persisted form data for better UX (requirement 1.4)
      if (preserveProgress) {
        setFormData(prev => ({
          ...prev,
          email: persistedFormData.email || prev.email,
          name: persistedFormData.name || prev.name,
          confirmationCode: '' // Always clear confirmation code
        }));
      }

      // Reset registration step when starting fresh registration
      setRegistrationStep('initial');
    } else if (newMode === 'confirm') {
      // Transitioning to confirmation mode - maintain email throughout flow (requirement 1.2)
      cleanupSensitiveData(['confirmationCode']); // Keep confirmation code, clear password

      // Ensure email is maintained from AuthContext, persisted data, or form data
      const emailToMaintain = pendingEmail || persistedFormData.email || formData.email;
      if (emailToMaintain) {
        setFormData(prev => ({
          ...prev,
          email: emailToMaintain,
          password: '', // Clear password for security
          name: persistedFormData.name || prev.name // Maintain name for context
        }));
        console.log('Email maintained during transition to confirm mode:', emailToMaintain);
      }

      // Set registration step to pending confirmation (requirement 1.1)
      setRegistrationStep('pending-confirmation');
    }
  }, [mode, authFlowState, registrationStep, pendingEmail, persistedFormData, formData, addToNavigationHistory, persistNonSensitiveData]);

  // Auto-switch to confirmation mode when AuthContext indicates confirmation is needed
  useEffect(() => {
    if (authFlowState === 'confirming' && mode !== 'confirm' && pendingEmail) {
      console.log('Auto-switching to confirm mode due to AuthContext state');
      switchMode('confirm');
    }
  }, [authFlowState, mode, pendingEmail, switchMode]);

  const handleResendCode = async () => {
    // Use pendingEmail from AuthContext if available, fallback to form email
    const emailToResend = pendingEmail || formData.email;

    try {
      setError(null);
      setIsResending(true);
      setShowRetryOption(false);
      setResendFeedbackMessage('');

      // Get current resend status before attempting
      const statusBefore = getResendStatus();
      if (!statusBefore.canResend) {
        const remainingSeconds = Math.ceil(statusBefore.cooldownRemaining / 1000);
        setError(`Please wait ${remainingSeconds} seconds before requesting another code.`);
        setIsResending(false);
        return;
      }

      // Enhanced resend with detailed feedback (requirement 2.3)
      const result = await resendConfirmationCode(emailToResend);

      if (result.success) {
        // Clear any previous errors and show success feedback
        setLastFailedOperation(null);
        setResendFeedbackMessage(result.message);

        // Show positive feedback with rate limiting info
        if (result.attemptsRemaining !== undefined) {
          const attemptsMsg = result.attemptsRemaining > 0
            ? ` (${result.attemptsRemaining} attempts remaining)`
            : ' (Maximum attempts reached)';
          setResendFeedbackMessage(result.message + attemptsMsg);
        }

        console.log('Resend successful:', result);
      } else {
        // Handle resend failure with specific error message
        setError(result.message);

        // Set up retry mechanism if appropriate
        if (result.message.includes('network') || result.message.includes('connection')) {
          setLastFailedOperation({
            type: 'resend',
            data: { email: emailToResend },
            retryCount: 0
          });
          setShowRetryOption(true);
        }
      }
    } catch (err) {
      console.error('Resend failed:', err);

      // Enhanced error handling with specific, actionable messages (requirement 3.1)
      let errorMessage = 'Failed to resend code. Please try again.';
      let canRetry = false;

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        // Provide specific guidance for common resend errors
        if (message.includes('wait') && message.includes('seconds')) {
          errorMessage = err.message; // Use the specific cooldown message
        } else if (message.includes('too many') || message.includes('limit exceeded')) {
          errorMessage = 'Too many resend attempts. Please wait a few minutes before requesting another code.';
        } else if (message.includes('user not found')) {
          errorMessage = 'Account not found. Please check your email address or try registering again.';
        } else if (message.includes('network') || message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
          canRetry = true;
        } else {
          errorMessage = err.message;
          canRetry = true;
        }
      }

      setError(errorMessage);

      // Set up retry mechanism for retryable resend errors (requirement 3.2)
      if (canRetry) {
        setLastFailedOperation({
          type: 'resend',
          data: { email: emailToResend },
          retryCount: 0
        });
        setShowRetryOption(true);
      }
    } finally {
      setIsResending(false);
    }
  };

  // Retry mechanism for failed operations (requirement 3.2)
  const retryLastOperation = async () => {
    if (!lastFailedOperation) return;

    const { type } = lastFailedOperation;
    setShowRetryOption(false);

    try {
      switch (type) {
        case 'login':
          await handleLoginInternal();
          break;
        case 'register':
          await handleRegisterInternal();
          break;
        case 'confirm':
          await handleConfirmInternal();
          break;
        case 'resend':
          await handleResendCode();
          break;
      }

      // Clear retry state on success
      setLastFailedOperation(null);
    } catch (error) {
      console.error('Retry operation failed:', error);
      // Increment retry count
      setLastFailedOperation(prev => prev ? { ...prev, retryCount: prev.retryCount + 1 } : null);
    }
  };

  const handleLoginInternal = async () => {
    setError(null);
    setIsSubmitting(true);
    setShowRetryOption(false);

    try {
      await login(formData.email, formData.password);
      // Clear retry state on success
      setLastFailedOperation(null);
      // Navigation will be handled by the useEffect above
    } catch (err) {
      console.error('Login failed:', err);

      // Enhanced error handling with specific, actionable messages (requirement 3.1)
      let errorMessage = 'Login failed. Please try again.';
      let canRetry = false;

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        // Provide specific guidance for common login errors
        if (message.includes('incorrect') || message.includes('not authorized')) {
          errorMessage = 'Incorrect email or password. Please check your credentials and try again.';
        } else if (message.includes('user not found')) {
          errorMessage = 'Account not found. Please check your email or create a new account.';
        } else if (message.includes('not confirmed')) {
          errorMessage = 'Your account is not confirmed. Please check your email for the confirmation code.';
          // Auto-switch to confirmation mode if user needs to confirm
          setTimeout(() => {
            switchMode('confirm');
          }, 2000);
        } else if (message.includes('too many') || message.includes('limit exceeded')) {
          errorMessage = 'Too many login attempts. Please wait a few minutes before trying again.';
        } else if (message.includes('network') || message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
          canRetry = true;
        } else {
          errorMessage = err.message;
          canRetry = true;
        }
      }

      setError(errorMessage);

      // Set up retry mechanism for retryable errors (requirement 3.2)
      if (canRetry) {
        setLastFailedOperation({
          type: 'login',
          data: { email: formData.email, password: formData.password },
          retryCount: 0
        });
        setShowRetryOption(true);
      }

      throw err; // Re-throw to be caught by wrapper
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLoginInternal();
  };

  const handleRegisterInternal = async () => {
    // Enhanced client-side validation with better error messages
    if (!formData.name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!formData.email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setShowRetryOption(false);

    try {
      console.log('Starting registration process...');

      // Use the enhanced return type from register method
      const registrationResult = await register(formData.email, formData.password, formData.name);

      console.log('Registration API call successful:', registrationResult);

      // Clear retry state on success
      setLastFailedOperation(null);

      // Enhanced handling of registration result with proper state transitions
      if (!registrationResult.isSignUpComplete) {
        // Registration successful but requires email confirmation
        console.log('Registration requires confirmation, transitioning to confirmation flow');

        // Update registration step to indicate confirmation is pending
        setRegistrationStep('pending-confirmation');

        // Switch to confirmation mode - this will trigger proper form cleanup
        switchMode('confirm');

        // Provide clear user feedback about next steps (requirement 2.2)
        setError('Registration successful! Please check your email for a confirmation code.');

        // Email is automatically maintained through AuthContext pendingEmail (requirement 1.2)
        console.log('Email maintained in AuthContext:', pendingEmail || formData.email);
      } else {
        // Registration is complete without confirmation (edge case)
        console.log('Registration complete without confirmation required');
        setRegistrationStep('confirmed');

        // Clear sensitive form data but maintain email for potential login
        setFormData(prev => ({
          ...prev,
          password: '',
          name: '',
          confirmationCode: ''
        }));
      }
    } catch (err) {
      console.error('Registration failed:', err);

      // Enhanced error handling with specific, actionable messages (requirement 3.1)
      let errorMessage = 'Registration failed. Please try again.';
      let canRetry = false;

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        // Provide specific guidance for common registration errors
        if (message.includes('username exists') || message.includes('user already exists')) {
          errorMessage = 'An account with this email already exists. Please try signing in instead.';
          // Offer to switch to login mode
          setTimeout(() => {
            if (window.confirm('Would you like to go to the sign in page?')) {
              switchMode('login');
            }
          }, 1000);
        } else if (message.includes('invalid password')) {
          errorMessage = 'Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.';
        } else if (message.includes('invalid email') || message.includes('invalid parameter')) {
          errorMessage = 'Please enter a valid email address.';
        } else if (message.includes('too many') || message.includes('limit exceeded')) {
          errorMessage = 'Too many registration attempts. Please wait a few minutes before trying again.';
        } else if (message.includes('network') || message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
          canRetry = true;
        } else {
          errorMessage = err.message;
          canRetry = true;
        }
      }

      setError(errorMessage);

      // Set up retry mechanism for retryable errors (requirement 3.2)
      if (canRetry) {
        setLastFailedOperation({
          type: 'register',
          data: { email: formData.email, password: formData.password, name: formData.name },
          retryCount: 0
        });
        setShowRetryOption(true);
      }

      // Reset registration step on error to allow retry
      setRegistrationStep('initial');

      throw err; // Re-throw to be caught by wrapper
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleRegisterInternal();
  };

  const handleConfirmInternal = async () => {
    // Enhanced client-side validation
    if (!formData.confirmationCode.trim()) {
      setError('Please enter the confirmation code.');
      return;
    }

    if (formData.confirmationCode.length !== 6) {
      setError('Confirmation code must be 6 digits.');
      return;
    }

    // Ensure we have an email to confirm (maintained throughout flow - requirement 1.2)
    const emailToConfirm = pendingEmail || formData.email;
    if (!emailToConfirm) {
      setError('Email address is missing. Please restart the registration process.');
      switchMode('register');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    setShowRetryOption(false);

    try {
      console.log('Confirming registration with maintained email:', emailToConfirm);

      await confirmRegistration(emailToConfirm, formData.confirmationCode);

      // Clear retry state on success
      setLastFailedOperation(null);

      // Update registration step to confirmed (requirement 1.1)
      setRegistrationStep('confirmed');
      console.log('Registration confirmation successful');

      // Show success message with automatic progression feedback (requirement 4.4)
      setError('Account confirmed successfully! Signing you in...');

      // Complete cleanup of sensitive data when registration is finished (requirement 5.1)
      cleanupSensitiveData([], true); // Complete cleanup

      // Set final form state with only email for potential future use
      setFormData({
        email: emailToConfirm, // Maintain email for potential future use
        password: '',
        name: '',
        confirmationCode: '',
      });

      // Automatic progression to next step after successful confirmation (requirement 4.4)
      // The AuthContext will handle the flow state transition to 'authenticated'
      // The useEffect will handle redirection when authFlowState becomes 'authenticated'

      // Add a small delay to show success feedback before potential redirection
      setTimeout(() => {
        // If automatic sign-in doesn't occur, provide clear guidance (requirement 2.4)
        if (!isAuthenticated && authFlowState !== 'authenticated') {
          setRegistrationStep('initial');
          setMode('login');
          setError('Account confirmed successfully! Please sign in with your email and password.');
        }
      }, 1500);

    } catch (err) {
      console.error('Confirmation failed:', err);

      // Enhanced error handling with specific, actionable messages (requirement 3.2)
      let errorMessage = 'Confirmation failed. Please try again.';
      let canRetry = false;

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        // Provide specific guidance for common confirmation errors
        if (message.includes('code mismatch') || message.includes('invalid verification code')) {
          errorMessage = 'Invalid confirmation code. Please check the code and try again.';
          canRetry = true;
        } else if (message.includes('expired')) {
          errorMessage = 'Confirmation code has expired. A new code has been sent to your email.';
          canRetry = true;
          // Automatic resend for expired codes (requirement 3.4)
          setTimeout(async () => {
            try {
              const resendResult = await resendConfirmationCode(emailToConfirm);
              if (resendResult.success) {
                setError('Confirmation code expired. A new code has been sent to your email.');
                setResendFeedbackMessage(resendResult.message);
              } else {
                setError('Confirmation code expired. Please click "Resend code" to get a new one.');
              }
            } catch (resendErr) {
              console.error('Auto-resend failed:', resendErr);
              setError('Confirmation code expired. Please click "Resend code" to get a new one.');
            }
          }, 1000);
        } else if (message.includes('user not found')) {
          errorMessage = 'Account not found. Please check your email or try registering again.';
        } else if (message.includes('too many') || message.includes('limit exceeded')) {
          errorMessage = 'Too many confirmation attempts. Please wait a few minutes before trying again.';
        } else if (message.includes('network') || message.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
          canRetry = true;
        } else {
          errorMessage = err.message;
          canRetry = true;
        }
      }

      setError(errorMessage);

      // Set up retry mechanism for retryable errors (requirement 3.2)
      if (canRetry) {
        setLastFailedOperation({
          type: 'confirm',
          data: { email: emailToConfirm, code: formData.confirmationCode },
          retryCount: 0
        });
        setShowRetryOption(true);
      }

      // Keep the user in confirmation mode to allow retry without losing progress (requirement 3.2)
      console.log('Confirmation failed, maintaining confirmation mode with email:', emailToConfirm);

      // Clear the confirmation code to allow fresh input
      setFormData(prev => ({ ...prev, confirmationCode: '' }));

      throw err; // Re-throw to be caught by wrapper
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleConfirmInternal();
  };

  const isButtonDisabled = isLoading || isSubmitting || isResending;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Logo size="lg" showText={false} />
          </div>
          <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-extrabold text-tertiary">
            Betterer
          </h2>
          <p className="mt-2 text-lg font-medium text-secondary">
            Making your words... well, betterer
          </p>
          <p className="mt-3 text-sm sm:text-base text-gray-600">
            {mode === 'login' && 'Sign in to start writing and editing your blog posts'}
            {mode === 'register' && 'Create your account to get started with Betterer'}
            {mode === 'confirm' && 'We sent a confirmation code to your email'}
          </p>

          {/* Progress indicator for registration flow (requirement 4.2) */}
          {(mode === 'register' || mode === 'confirm') && (
            <div className="mt-4 px-4">
              <div className="flex items-center justify-between max-w-xs mx-auto">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    mode === 'register'
                      ? 'bg-blue-500 text-white'
                      : 'bg-green-500 text-white'
                  }`}>
                    {mode === 'register' ? '1' : '✓'}
                  </div>
                  <span className={`mt-1 text-xs font-medium ${
                    mode === 'register' ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    Sign Up
                  </span>
                </div>

                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  mode === 'confirm' ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>

                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    mode === 'confirm'
                      ? (formData.confirmationCode.length === 6 ? 'bg-green-500 text-white' : 'bg-blue-500 text-white')
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {mode === 'confirm' && formData.confirmationCode.length === 6 ? '✓' : '2'}
                  </div>
                  <span className={`mt-1 text-xs font-medium ${
                    mode === 'confirm'
                      ? (formData.confirmationCode.length === 6 ? 'text-green-600' : 'text-blue-600')
                      : 'text-gray-500'
                  }`}>
                    Verify
                  </span>
                </div>

                <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                  registrationStep === 'confirmed' ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>

                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    registrationStep === 'confirmed'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {registrationStep === 'confirmed' ? '✓' : '3'}
                  </div>
                  <span className={`mt-1 text-xs font-medium ${
                    registrationStep === 'confirmed' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    Done
                  </span>
                </div>
              </div>

              {/* Step-specific guidance messages (requirement 2.1, 2.2) */}
              <div className="mt-3 text-center">
                {mode === 'register' && (
                  <p className="text-sm text-gray-600">
                    Step 1 of 3: Create your account with a secure password
                  </p>
                )}
                {mode === 'confirm' && (
                  <p className="text-sm text-gray-600">
                    Step 2 of 3: Enter the 6-digit code we sent to your email
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
          {error && (
            <div className={`rounded-md p-3 sm:p-4 border ${error.includes('confirmed')
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
              }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className={`h-5 w-5 ${error.includes('confirmed') ? 'text-green-400' : 'text-red-400'
                      }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <div className={`text-sm ${error.includes('confirmed') ? 'text-green-700' : 'text-red-700'
                    }`}>
                    {error}
                  </div>
                  {/* Enhanced retry mechanism for failed operations (requirement 3.2) */}
                  {showRetryOption && lastFailedOperation && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={retryLastOperation}
                        disabled={isSubmitting || isResending}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Try Again
                        {lastFailedOperation.retryCount > 0 && (
                          <span className="ml-1 text-xs">({lastFailedOperation.retryCount + 1})</span>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Enter your password"
                />
              </div>
              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>
              <div className="text-center space-y-2">
                {/* Back navigation button (requirement 4.3) */}
                {canNavigateBack() && (
                  <div>
                    <button
                      type="button"
                      onClick={navigateBack}
                      className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => canSwitchMode('register') && switchMode('register')}
                  disabled={!canSwitchMode('register')}
                  className="text-sm text-primary hover:text-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Don't have an account? Sign up
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const newFormData = { ...formData, name: e.target.value };
                    setFormData(newFormData);
                    // Auto-persist non-sensitive data as user types (requirement 1.4)
                    setPersistedFormData(prev => ({ ...prev, name: e.target.value }));
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                  placeholder="Create a password"
                />

                {/* Password requirements guidance with strength indicator (requirement 2.1) */}
                {formData.password.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {/* Password strength bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-600 font-medium">Password strength:</p>
                        <span className={`text-xs font-medium ${
                          (() => {
                            const checks = [
                              formData.password.length >= 8,
                              /[A-Z]/.test(formData.password),
                              /[a-z]/.test(formData.password),
                              /[0-9]/.test(formData.password),
                              /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
                            ];
                            const score = checks.filter(Boolean).length;
                            if (score < 2) return 'text-red-600';
                            if (score < 4) return 'text-yellow-600';
                            return 'text-green-600';
                          })()
                        }`}>
                          {(() => {
                            const checks = [
                              formData.password.length >= 8,
                              /[A-Z]/.test(formData.password),
                              /[a-z]/.test(formData.password),
                              /[0-9]/.test(formData.password),
                              /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
                            ];
                            const score = checks.filter(Boolean).length;
                            if (score < 2) return 'Weak';
                            if (score < 4) return 'Fair';
                            if (score < 5) return 'Good';
                            return 'Strong';
                          })()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            (() => {
                              const checks = [
                                formData.password.length >= 8,
                                /[A-Z]/.test(formData.password),
                                /[a-z]/.test(formData.password),
                                /[0-9]/.test(formData.password),
                                /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
                              ];
                              const score = checks.filter(Boolean).length;
                              if (score < 2) return 'bg-red-500';
                              if (score < 4) return 'bg-yellow-500';
                              return 'bg-green-500';
                            })()
                          }`}
                          style={{
                            width: `${(() => {
                              const checks = [
                                formData.password.length >= 8,
                                /[A-Z]/.test(formData.password),
                                /[a-z]/.test(formData.password),
                                /[0-9]/.test(formData.password),
                                /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
                              ];
                              return (checks.filter(Boolean).length / 5) * 100;
                            })()}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* Requirements checklist */}
                    <div className="grid grid-cols-1 gap-1 text-xs">
                      <div className={`flex items-center space-x-1 transition-colors ${
                        formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <svg className={`w-3 h-3 ${formData.password.length >= 8 ? 'text-green-500' : 'text-gray-400'}`}
                             fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>At least 8 characters long</span>
                      </div>
                      <div className={`flex items-center space-x-1 transition-colors ${
                        /[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <svg className={`w-3 h-3 ${/[A-Z]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}`}
                             fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center space-x-1 transition-colors ${
                        /[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <svg className={`w-3 h-3 ${/[a-z]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}`}
                             fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className={`flex items-center space-x-1 transition-colors ${
                        /[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <svg className={`w-3 h-3 ${/[0-9]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}`}
                             fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>One number (0-9)</span>
                      </div>
                      <div className={`flex items-center space-x-1 transition-colors ${
                        /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        <svg className={`w-3 h-3 ${/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-green-500' : 'text-gray-400'}`}
                             fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>One special character (!@#$%^&*)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>


              {/* What to expect next messaging (requirement 2.2) */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-gray-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">What happens next:</span> After creating your account, we'll send a confirmation code to your email. You'll need to enter this code to complete your registration.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>
              <div className="text-center space-y-2">
                {/* Back navigation button (requirement 4.3) */}
                {canNavigateBack() && (
                  <div>
                    <button
                      type="button"
                      onClick={navigateBack}
                      className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => canSwitchMode('login') && switchMode('login')}
                  disabled={!canSwitchMode('login')}
                  className="text-sm text-primary hover:text-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}

          {mode === 'confirm' && (
            <div className="space-y-6">
              {/* Enhanced confirmation guidance (requirement 2.2) */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Check your email
                    </h3>
                    <div className="mt-1 text-sm text-blue-700">
                      <p>We sent a 6-digit confirmation code to:</p>
                      <p className="font-medium mt-1">{pendingEmail || formData.email}</p>
                      <p className="mt-2 text-xs">
                        The code will expire in 15 minutes. If you don't see the email, check your spam folder.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Confirmation code
                </label>
                <div className="mt-1 relative">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={6}
                    value={formData.confirmationCode}
                    onChange={(e) => {
                      // Only allow numeric input (6-digit numeric only)
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setFormData({ ...formData, confirmationCode: value });

                      // Auto-submit when 6 digits are entered (automatic progression)
                      if (value.length === 6 && !isSubmitting) {
                        // Small delay to allow user to see the complete code
                        setTimeout(() => {
                          const form = e.target.closest('form');
                          if (form) {
                            form.requestSubmit();
                          }
                        }, 300);
                      }
                    }}
                    className={`block w-full px-4 py-3 border rounded-md shadow-sm focus:outline-none text-center text-2xl tracking-[0.5em] font-mono transition-colors ${
                      formData.confirmationCode.length === 6
                        ? 'border-green-400 bg-green-50 focus:ring-green-500 focus:border-green-500'
                        : formData.confirmationCode.length > 0
                        ? 'border-blue-400 bg-blue-50 focus:ring-primary focus:border-primary'
                        : 'border-gray-300 focus:ring-primary focus:border-primary'
                    }`}
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                  {/* Visual feedback for validation */}
                  {formData.confirmationCode.length > 0 && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {formData.confirmationCode.length === 6 ? (
                        <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <div className="flex space-x-1">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                i < formData.confirmationCode.length ? 'bg-blue-500' : 'bg-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Enhanced confirmation process instructions (requirement 2.2) */}
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-600">
                    Enter the 6-digit code from your email
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Numbers only</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Auto-submits when complete</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={isButtonDisabled || formData.confirmationCode.length !== 6}
                className={`w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  formData.confirmationCode.length === 6 && !isButtonDisabled
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-primary hover:bg-primary-hover'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Confirming...
                  </div>
                ) : formData.confirmationCode.length === 6 ? (
                  'Confirm account ✓'
                ) : (
                  `Confirm account (${formData.confirmationCode.length}/6)`
                )}
              </button>
              <div className="text-center space-y-2">
                {/* Enhanced resend functionality with rate limiting display (requirement 3.4, 5.2) */}
                <div className="space-y-2">
                  {/* Resend button with enhanced feedback */}
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={isResending || isLoading || !getResendStatus().canResend}
                      className="text-sm text-secondary hover:text-secondary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isResending ? 'Sending...' :
                       !getResendStatus().canResend ? `Resend in ${resendCooldownDisplay}` :
                       "Didn't receive a code? Resend"}
                    </button>

                    {/* Rate limiting display (requirement 5.2) */}
                    {resendCooldownDisplay && (
                      <div className="text-xs text-orange-600">
                        Please wait {resendCooldownDisplay} before requesting another code
                      </div>
                    )}

                    {/* Positive feedback for successful resend */}
                    {resendFeedbackMessage && (
                      <div className="text-xs text-green-600">
                        {resendFeedbackMessage}
                      </div>
                    )}

                    {/* Display resend attempt count and guidance */}
                    {(() => {
                      const status = getResendStatus();
                      if (status.attemptsUsed > 0) {
                        return (
                          <div className="text-xs text-gray-500">
                            {status.attemptsUsed === 1 ? 'Code resent once' : `Code resent ${status.attemptsUsed} times`}
                            {status.attemptsUsed >= 3 && (
                              <div className="text-orange-600 mt-1">
                                Multiple resend attempts detected. Please check your spam folder or wait a few minutes.
                              </div>
                            )}
                            {status.attemptsUsed >= 5 && (
                              <div className="text-red-600 mt-1">
                                Maximum resend attempts reached. Please contact support if you continue having issues.
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Auto-resend suggestion for expired codes (requirement 3.4) */}
                  {showAutoResendSuggestion && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2 text-xs text-yellow-800">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Code may have expired.
                        <button
                          type="button"
                          onClick={() => {
                            setShowAutoResendSuggestion(false);
                            handleResendCode();
                          }}
                          className="ml-1 underline hover:no-underline"
                          disabled={!getResendStatus().canResend}
                        >
                          {getResendStatus().canResend ? 'Get a new code' : `Wait ${resendCooldownDisplay}`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {/* Back navigation button (requirement 4.3) */}
                  {canNavigateBack() && (
                    <div>
                      <button
                        type="button"
                        onClick={navigateBack}
                        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => canSwitchMode('login') && switchMode('login')}
                    disabled={!canSwitchMode('login')}
                    className="text-sm text-primary hover:text-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            </form>
            </div>
          )}

          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Secure authentication</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
