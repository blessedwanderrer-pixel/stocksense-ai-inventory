import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { ManagerDashboardPage } from '../pages/ManagerDashboardPage';
import { StaffDashboardPage } from '../pages/StaffDashboardPage';
import { InventoryPage } from '../pages/InventoryPage';
import { MovementsPage } from '../pages/MovementsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { AIAssistantPage } from '../pages/AIAssistantPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ApplicationShell } from '../components/layout/ApplicationShell';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleRoute } from './RoleRoute';

export const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  const rootDestination = user
    ? user.role === 'manager'
      ? '/manager'
      : '/staff'
    : '/login';

  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to={rootDestination} replace />} />

      {/* Public / Auth routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Manager Dashboard */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRole="manager">
              <ApplicationShell>
                <ManagerDashboardPage />
              </ApplicationShell>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Protected Staff Dashboard */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRole="staff">
              <ApplicationShell>
                <StaffDashboardPage />
              </ApplicationShell>
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Inventory Catalog Workspace */}
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <ApplicationShell>
              <InventoryPage />
            </ApplicationShell>
          </ProtectedRoute>
        }
      />

      {/* Stock Movements Workspace */}
      <Route
        path="/movements"
        element={
          <ProtectedRoute>
            <ApplicationShell>
              <MovementsPage />
            </ApplicationShell>
          </ProtectedRoute>
        }
      />

      {/* Operational Reports Workspace */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ApplicationShell>
              <ReportsPage />
            </ApplicationShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <ApplicationShell>
              <AIAssistantPage />
            </ApplicationShell>
          </ProtectedRoute>
        }
      />

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
