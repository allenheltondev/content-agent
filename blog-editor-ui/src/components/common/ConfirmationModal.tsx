import { XMarkIcon, ExclamationTriangleIcon, CheckCircleIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  type?: 'warning' | 'success' | 'info';
  icon?: 'warning' | 'success' | 'submit';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmationModal = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  type = 'info',
  icon = 'warning',
  onConfirm,
  onCancel,
  isLoading = false
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  const getIconComponent = () => {
    switch (icon) {
      case 'success':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'submit':
        return <PaperAirplaneIcon className="h-6 w-6 text-primary" />;
      case 'warning':
      default:
        return <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />;
    }
  };

  const getConfirmButtonStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500';
      case 'info':
      default:
        return 'bg-primary hover:bg-primary-hover focus:ring-primary';
    }
  };

  const handleConfirm = () => {
    if (!isLoading) {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            {getIconComponent()}
            <h2 className="text-lg font-semibold text-gray-900 ml-3">{title}</h2>
          </div>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${getConfirmButtonStyles()}`}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
