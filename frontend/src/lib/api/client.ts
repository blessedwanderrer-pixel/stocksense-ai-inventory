import { getSupabase } from '../supabase/client';
import { getFrontendConfig } from '../supabase/config';
import { ApiError } from './errors';
import type { AuthenticatedProfile } from '../../types/auth';
import type {
  InventorySummaryResponse,
  LowStockResponse,
  BestSellingResponse,
} from '../../types/dashboard';
import type {
  StockMovementHistoryResponse,
  StockMovementResponse,
  StockMovementCreateRequest,
} from '../../types/movements';
import type {
  ProductListResponse,
  ProductResponse,
  ProductCreateRequest,
  ProductUpdateRequest,
} from '../../types/inventory';
import type {
  AIChatRequest,
  AIChatResponse,
  PendingActionCancellation,
  PendingActionConfirmation,
} from '../../types/ai';

export type TokenProvider = () => Promise<string | null>;
export type UnauthorizedHandler = () => void;

let globalUnauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  globalUnauthorizedHandler = handler;
}

export async function getDefaultToken(): Promise<string | null> {
  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export interface RequestOptions extends RequestInit {
  token?: string | null;
  getToken?: TokenProvider;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { apiBaseUrl } = getFrontendConfig();
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${apiBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let token = options.token;
  if (token === undefined) {
    const getToken = options.getToken || getDefaultToken;
    token = await getToken();
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err;
    }
    // Network or service down treated as service unavailable
    throw new ApiError(503, 'Service Unavailable', 'Failed to connect to the backend server.');
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const errJson = await response.json();
      if (errJson && typeof errJson === 'object') {
        detail = errJson.detail || errJson.message || JSON.stringify(errJson);
      }
    } catch {
      // response is not JSON
    }

    if (response.status === 401 && globalUnauthorizedHandler) {
      globalUnauthorizedHandler();
    }

    throw new ApiError(response.status, response.statusText, detail);
  }

  try {
    return (await response.json()) as T;
  } catch {
    return {} as T;
  }
}

// Concrete typed API methods
export const api = {
  // GET /api/me: authoritative user profile and role
  getProfile: (signal?: AbortSignal, token?: string | null) =>
    apiClient<AuthenticatedProfile>('/api/me', { signal, token }),

  // GET /api/reports/inventory-summary: exact 4 KPI numbers
  getInventorySummary: (signal?: AbortSignal) =>
    apiClient<InventorySummaryResponse>('/api/reports/inventory-summary', { signal }),

  // GET /api/reports/low-stock: operational product stock
  getLowStockReport: (signal?: AbortSignal) =>
    apiClient<LowStockResponse>('/api/reports/low-stock', { signal }),

  // GET /api/reports/best-selling?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
  getBestSellingReport: (startDate: string, endDate: string, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    return apiClient<BestSellingResponse>(`/api/reports/best-selling?${params.toString()}`, { signal });
  },

  // GET /api/stock-movements
  getStockMovements: (signal?: AbortSignal) =>
    apiClient<StockMovementHistoryResponse>('/api/stock-movements', { signal }),

  // GET /api/products
  getProducts: (signal?: AbortSignal) =>
    apiClient<ProductListResponse>('/api/products', { signal }),

  // GET /api/products/{productId}
  getProduct: (productId: number, signal?: AbortSignal) =>
    apiClient<ProductResponse>(`/api/products/${productId}`, { signal }),

  // POST /api/products
  createProduct: (payload: ProductCreateRequest, signal?: AbortSignal) =>
    apiClient<ProductResponse>('/api/products', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    }),

  // PATCH /api/products/{productId}
  updateProduct: (productId: number, payload: ProductUpdateRequest, signal?: AbortSignal) =>
    apiClient<ProductResponse>(`/api/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      signal,
    }),

  // POST /api/stock-movements
  createStockMovement: (payload: StockMovementCreateRequest, signal?: AbortSignal) =>
    apiClient<StockMovementResponse>('/api/stock-movements', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    }),

  // POST /api/ai/chat
  sendAIChatMessage: (payload: AIChatRequest, signal?: AbortSignal) =>
    apiClient<AIChatResponse>('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
      signal,
    }),

  // Server-controlled pending actions accept only the action UUID in the path.
  confirmPendingAction: (actionId: string, signal?: AbortSignal) =>
    apiClient<PendingActionConfirmation>(
      `/api/ai/pending-actions/${encodeURIComponent(actionId)}/confirm`,
      { method: 'POST', signal }
    ),

  cancelPendingAction: (actionId: string, signal?: AbortSignal) =>
    apiClient<PendingActionCancellation>(
      `/api/ai/pending-actions/${encodeURIComponent(actionId)}/cancel`,
      { method: 'POST', signal }
    ),
};
