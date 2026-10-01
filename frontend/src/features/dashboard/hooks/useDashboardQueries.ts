import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../../lib/api/client';
import { dashboardKeys, inventoryKeys } from '../../../lib/query/queryKeys';
import type {
  InventorySummaryResponse,
  LowStockResponse,
  BestSellingResponse,
} from '../../../types/dashboard';
import type { StockMovementHistoryResponse } from '../../../types/movements';

export function useInventorySummary() {
  const { user } = useAuth();
  const isEnabled = Boolean(user && (user.role === 'manager' || user.role === 'staff'));

  return useQuery<InventorySummaryResponse, Error>({
    queryKey: dashboardKeys.summary(),
    queryFn: ({ signal }) => api.getInventorySummary(signal),
    enabled: isEnabled,
  });
}

export function useLowStockReport() {
  const { user } = useAuth();
  const isEnabled = Boolean(user && (user.role === 'manager' || user.role === 'staff'));

  return useQuery<LowStockResponse, Error>({
    queryKey: dashboardKeys.lowStock(),
    queryFn: ({ signal }) => api.getLowStockReport(signal),
    enabled: isEnabled,
  });
}

export function useBestSellingReport(startDate: string, endDate: string) {
  const { user } = useAuth();
  const isEnabled = Boolean(
    user && (user.role === 'manager' || user.role === 'staff') && startDate && endDate
  );

  return useQuery<BestSellingResponse, Error>({
    queryKey: dashboardKeys.bestSelling(startDate, endDate),
    queryFn: ({ signal }) => api.getBestSellingReport(startDate, endDate, signal),
    enabled: isEnabled,
  });
}

export function useStockMovements() {
  const { user } = useAuth();
  const isEnabled = Boolean(user && (user.role === 'manager' || user.role === 'staff'));

  return useQuery<StockMovementHistoryResponse, Error>({
    queryKey: dashboardKeys.movements(),
    queryFn: ({ signal }) => api.getStockMovements(signal),
    enabled: isEnabled,
  });
}

export function useRefreshDashboard() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
    ]);
  };
}
