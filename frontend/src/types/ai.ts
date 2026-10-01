import type { StockMovementType } from './movements';

export type AIResponseType = 'answer' | 'refusal' | 'pending_action';

export interface AIChatRequest {
  message: string;
}

export interface PendingActionPreview {
  id: string;
  status: 'pending_confirmation';
  action_type: StockMovementType;
  product_id: number;
  product: string;
  sku: string;
  quantity: number;
  supplier: string | null;
  current_stock: number;
  expected_stock_after: number;
  expires_at: string;
  required_response: 'Confirm or Cancel';
}

export interface AIChatResponse {
  type: AIResponseType;
  message: string;
  data: unknown | null;
  pending_action: PendingActionPreview | null;
}

export interface PendingActionConfirmation {
  id: string;
  status: 'confirmed';
  movement_id: number;
  product_id: number;
  final_stock: number;
}

export interface PendingActionCancellation {
  id: string;
  status: 'cancelled';
}

