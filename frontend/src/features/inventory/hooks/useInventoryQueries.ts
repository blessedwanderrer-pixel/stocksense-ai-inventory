import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { api } from '../../../lib/api/client';
import { inventoryKeys, dashboardKeys } from '../../../lib/query/queryKeys';
import {
  sanitizeProductForRole,
  type ProductListResponse,
  type ProductResponse,
  type ProductCreateRequest,
  type ProductUpdateRequest,
  type StaffProductViewModel,
} from '../../../types/inventory';
import type {
  StockMovementCreateRequest,
  StockMovementResponse,
  StockMovementHistoryResponse,
} from '../../../types/movements';
import { ApiError } from '../../../lib/api/errors';

async function invalidateOperationalData(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  ]);
}

export function useProducts() {
  const { user } = useAuth();
  const userId = user?.id;
  const role = user?.role;
  const isEnabled = Boolean(user && (role === 'manager' || role === 'staff'));

  return useQuery<Array<ProductResponse | StaffProductViewModel>, Error>({
    queryKey: inventoryKeys.products(userId, role),
    queryFn: async ({ signal }) => {
      const data = await api.getProducts(signal);
      if (!role) return data;
      // Sanitize role-specific data so Staff never receives cost_price
      return data.map((item) => sanitizeProductForRole(item, role));
    },
    enabled: isEnabled,
  });
}

export function useProduct(productId: number | undefined) {
  const { user } = useAuth();
  const userId = user?.id;
  const role = user?.role;
  const isEnabled = Boolean(
    user && (role === 'manager' || role === 'staff') && productId !== undefined && productId > 0
  );

  return useQuery<ProductResponse | StaffProductViewModel, Error>({
    queryKey: inventoryKeys.product(userId, role, productId || 0),
    queryFn: async ({ signal }) => {
      if (!productId) throw new Error('Product ID required');
      const data = await api.getProduct(productId, signal);
      if (!role) return data;
      return sanitizeProductForRole(data, role);
    },
    enabled: isEnabled,
  });
}

export function useStockMovementsHistory() {
  const { user } = useAuth();
  const isEnabled = Boolean(user && (user.role === 'manager' || user.role === 'staff'));

  return useQuery<StockMovementHistoryResponse, Error>({
    queryKey: inventoryKeys.movements(),
    queryFn: ({ signal }) => api.getStockMovements(signal),
    enabled: isEnabled,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<ProductResponse, Error, ProductCreateRequest>({
    mutationFn: (payload: ProductCreateRequest) => {
      if (user?.role !== 'manager') {
        throw new Error('Manager permission required to create products');
      }
      return api.createProduct(payload);
    },
    onSuccess: async () => {
      await invalidateOperationalData(queryClient);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<ProductResponse, Error, { id: number; payload: ProductUpdateRequest }>({
    mutationFn: ({ id, payload }) => {
      if (user?.role !== 'manager') {
        throw new Error('Manager permission required to update products');
      }
      return api.updateProduct(id, payload);
    },
    onSuccess: async () => {
      await invalidateOperationalData(queryClient);
    },
  });
}

export function useRecordStockMovement() {
  const queryClient = useQueryClient();

  return useMutation<StockMovementResponse, Error, StockMovementCreateRequest>({
    mutationFn: (payload: StockMovementCreateRequest) => api.createStockMovement(payload),
    onSuccess: async () => {
      await invalidateOperationalData(queryClient);
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.isConflict) {
        await invalidateOperationalData(queryClient);
      }
    },
  });
}
