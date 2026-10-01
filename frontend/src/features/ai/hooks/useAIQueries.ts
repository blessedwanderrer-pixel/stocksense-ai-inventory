import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api/client';
import { dashboardKeys, inventoryKeys } from '../../../lib/query/queryKeys';
import type {
  AIChatRequest,
  AIChatResponse,
  PendingActionCancellation,
  PendingActionConfirmation,
} from '../../../types/ai';

async function invalidateInventoryTruth(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: inventoryKeys.all }),
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
  ]);
}

export function useAIChat() {
  return useMutation<AIChatResponse, Error, AIChatRequest>({
    mutationFn: (payload) => api.sendAIChatMessage(payload),
  });
}

export function useConfirmPendingAction() {
  const queryClient = useQueryClient();
  return useMutation<PendingActionConfirmation, Error, string>({
    mutationFn: (actionId) => api.confirmPendingAction(actionId),
    onSuccess: async () => invalidateInventoryTruth(queryClient),
    onError: async () => invalidateInventoryTruth(queryClient),
  });
}

export function useCancelPendingAction() {
  const queryClient = useQueryClient();
  return useMutation<PendingActionCancellation, Error, string>({
    mutationFn: (actionId) => api.cancelPendingAction(actionId),
    onSuccess: async () => invalidateInventoryTruth(queryClient),
  });
}

