import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { Spinner } from '../components/ui/Spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, isUnauthorizedProfile } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" label="Verifying session and role..." className="text-emerald-600" />
          <span className="text-xs font-medium text-zinc-500">Verifying StockSense profile...</span>
        </div>
      </div>
    );
  }

  if (isUnauthorizedProfile) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
