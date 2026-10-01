import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import type { UserRole } from '../types/auth';

interface RoleRouteProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRole, children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    if (user.role === 'manager') {
      return <Navigate to="/manager" replace />;
    }
    if (user.role === 'staff') {
      return <Navigate to="/staff" replace />;
    }
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
