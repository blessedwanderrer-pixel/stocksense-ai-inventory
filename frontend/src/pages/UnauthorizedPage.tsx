import React from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/ui/Button';
import { ShieldAlert, LogOut, RefreshCw } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const { user, logout, refreshProfile } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 shadow-sm mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Unauthorized Access
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your account is authenticated, but your profile has not been assigned a valid StockSense role (Manager or Staff).
        </p>

        {user?.email && (
          <div className="mt-4 p-3 bg-zinc-200/60 rounded-lg text-xs font-mono text-zinc-700 inline-block">
            Signed in as: {user.email}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => refreshProfile()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Check Role Again
          </Button>

          <Button
            variant="danger"
            onClick={() => logout()}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>

        <p className="mt-6 text-xs text-zinc-400">
          Please contact your StockSense organization administrator to assign your operational role.
        </p>
      </div>
    </div>
  );
};
