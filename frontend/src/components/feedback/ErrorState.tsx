import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while communicating with the server.',
  onRetry,
  isRetrying = false,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center justify-center p-6 text-center bg-red-50/40 rounded-lg border border-red-200/80 ${className}`}
    >
      <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-2">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-zinc-900">{title}</h4>
      <p className="text-xs text-zinc-600 mt-1 max-w-md">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            isLoading={isRetrying}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
};
