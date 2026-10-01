import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/ui/Button';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const targetPath = user ? (user.role === 'manager' ? '/manager' : '/staff') : '/login';

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col justify-center items-center py-12 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-600 mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h1 className="text-2xl font-bold text-zinc-900">Page Not Found</h1>
      <p className="text-sm text-zinc-500 mt-1 max-w-sm">
        The page you requested does not exist or has been moved.
      </p>
      <div className="mt-6">
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate(targetPath)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Return to StockSense
        </Button>
      </div>
    </div>
  );
};
