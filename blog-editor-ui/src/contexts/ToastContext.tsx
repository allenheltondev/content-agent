import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import type { ToastMessage } from '../types';
import { ToastContainer } from '../components/common/Toast';

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (message: string, type?: ToastMessage['type'], duration?: number) => string;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  showSuccess: (message: string, duration?: number) => string;
  showError: (message: string, duration?: number) => string;
  showWarning: (message: string, duration?: number) => string;
  showInfo: (message: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

/**
 * Global toast provider that manages all toast notifications
 */
export const ToastProvider = ({ children, maxToasts = 5 }: ToastProviderProps) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    message: string,
    type: ToastMessage['type'] = 'info',
    duration?: number
  ): string => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = {
      id,
      message,
      type,
      duration: duration || (type === 'error' ? 7000 : 5000), // Errors stay longer
    };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Limit the number of toasts
      return updated.slice(-maxToasts);
    });

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const showSuccess = useCallback((message: string, duration?: number) =>
    addToast(message, 'success', duration), [addToast]);

  const showError = useCallback((message: string, duration?: number) =>
    addToast(message, 'error', duration), [addToast]);

  const showWarning = useCallback((message: string, duration?: number) =>
    addToast(message, 'warning', duration), [addToast]);

  const showInfo = useCallback((message: string, duration?: number) =>
    addToast(message, 'info', duration), [addToast]);

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

/**
 * Hook to use toast notifications
 */
export const useToastContext = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

/**
 * Hook for error handling with automatic toast notifications
 */
export const useErrorHandler = () => {
  const { showError, showWarning } = useToastContext();

  const handleError = useCallback((error: Error | string, context?: string) => {
    const message = typeof error === 'string' ? error : error.message;
    const displayMessage = context ? `${context}: ${message}` : message;
    showError(displayMessage);
  }, [showError]);

  const handleWarning = useCallback((message: string, context?: string) => {
    const displayMessage = context ? `${context}: ${message}` : message;
    showWarning(displayMessage);
  }, [showWarning]);

  return {
    handleError,
    handleWarning
  };
};
