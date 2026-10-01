import React, { useState } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { RoleBadge } from '../ui/RoleBadge';
import { Button } from '../ui/Button';
import { RefreshCw } from 'lucide-react';
import { useRefreshDashboard } from '../../features/dashboard/hooks/useDashboardQueries';

interface PageHeaderProps {
  title: string;
  description?: string;
  showRefresh?: boolean;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  showRefresh = true,
  actions,
}) => {
  const { user } = useAuth();
  const refreshDashboard = useRefreshDashboard();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshDashboard();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-200">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            {title}
          </h1>
          {user && <RoleBadge role={user.role} />}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl">
            {description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 self-start sm:self-auto">
        {user?.email && (
          <span className="hidden lg:inline text-xs text-zinc-500">
            Authenticated: <strong className="text-zinc-700">{user.email}</strong>
          </span>
        )}

        {showRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            aria-label="Refresh operational dashboard data"
          >
            Refresh Data
          </Button>
        )}
        {actions}
      </div>
    </header>
  );
};
