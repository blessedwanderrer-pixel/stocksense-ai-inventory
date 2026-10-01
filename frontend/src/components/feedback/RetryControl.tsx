import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface RetryControlProps {
  onRetry: () => void;
  isRetrying?: boolean;
  size?: 'sm' | 'md';
  label?: string;
}

export const RetryControl: React.FC<RetryControlProps> = ({
  onRetry,
  isRetrying = false,
  size = 'sm',
  label = 'Retry',
}) => {
  return (
    <Button
      variant="outline"
      size={size}
      onClick={onRetry}
      isLoading={isRetrying}
      leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />}
      aria-label={label}
    >
      {label}
    </Button>
  );
};
