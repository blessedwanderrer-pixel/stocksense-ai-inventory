import type { UserRole } from '../../types/auth';

export const authKeys = {
  all: ['auth'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'inventory-summary'] as const,
  lowStock: () => [...dashboardKeys.all, 'low-stock'] as const,
  bestSelling: (startDate: string, endDate: string) =>
    [...dashboardKeys.all, 'best-selling', startDate, endDate] as const,
  movements: () => [...dashboardKeys.all, 'stock-movements'] as const,
};

export const inventoryKeys = {
  all: ['inventory'] as const,
  productsList: () => [...inventoryKeys.all, 'products'] as const,
  products: (userId?: string, role?: UserRole) =>
    userId && role
      ? ([...inventoryKeys.all, 'products', userId, role] as const)
      : ([...inventoryKeys.all, 'products'] as const),
  product: (userId: string | undefined, role: UserRole | undefined, productId: number) =>
    userId && role
      ? ([...inventoryKeys.all, 'product', userId, role, productId] as const)
      : ([...inventoryKeys.all, 'product', productId] as const),
  movements: () => [...inventoryKeys.all, 'stock-movements'] as const,
};
