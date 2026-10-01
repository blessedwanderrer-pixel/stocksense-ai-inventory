import React, { useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, Clock3, PackageCheck, XCircle } from 'lucide-react';
import { ApiError } from '../../../lib/api/errors';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { useCancelPendingAction, useConfirmPendingAction } from '../hooks/useAIQueries';
import type {
  PendingActionCancellation,
  PendingActionConfirmation,
  PendingActionPreview,
} from '../../../types/ai';

interface PendingActionCardProps {
  action: PendingActionPreview;
}

type ActionOutcome = PendingActionConfirmation | PendingActionCancellation;

const movementLabels = {
  stock_in: 'Stock In',
  sale: 'Sale',
  damaged: 'Damaged',
} as const;

function actionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'The pending action could not be processed.';
  if (error.status === 404) return 'This pending action was not found or does not belong to your account.';
  if (error.status === 410) return 'This pending action has expired. Submit the request again for a new preview.';
  if (error.status === 409) return error.detail || 'This action was already completed, cancelled, or can no longer be applied.';
  if (error.status === 503) return 'The pending-action service is temporarily unavailable. No stock was changed.';
  return error.detail || 'The pending action could not be processed.';
}

export const PendingActionCard: React.FC<PendingActionCardProps> = ({ action }) => {
  const confirmMutation = useConfirmPendingAction();
  const cancelMutation = useCancelPendingAction();
  const [outcome, setOutcome] = useState<ActionOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isWorking = confirmMutation.isPending || cancelMutation.isPending;
  const isSettled = outcome !== null;

  const confirm = async () => {
    setError(null);
    try {
      setOutcome(await confirmMutation.mutateAsync(action.id));
    } catch (caught) {
      setError(actionErrorMessage(caught));
    }
  };

  const cancel = async () => {
    setError(null);
    try {
      setOutcome(await cancelMutation.mutateAsync(action.id));
    } catch (caught) {
      setError(actionErrorMessage(caught));
    }
  };

  return (
    <section
      aria-label={`Pending ${movementLabels[action.action_type]} action for ${action.product}`}
      className="mt-4 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 border-b border-amber-100 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-amber-950">Pending confirmation</p>
            <p className="text-[11px] text-amber-700">No inventory has changed yet</p>
          </div>
        </div>
        <span className="rounded-md border border-amber-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
          {movementLabels[action.action_type]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-xs sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-zinc-500">Product</dt>
          <dd className="mt-0.5 font-semibold text-zinc-900">{action.product}</dd>
          <dd className="font-mono text-[11px] text-zinc-500">{action.sku}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Quantity</dt>
          <dd className="mt-0.5 font-mono text-base font-bold text-zinc-900">{action.quantity}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Stock preview</dt>
          <dd className="mt-0.5 font-mono text-base font-bold text-zinc-900">
            {action.current_stock} → {action.expected_stock_after}
          </dd>
        </div>
        {action.supplier && (
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-zinc-500">Supplier</dt>
            <dd className="mt-0.5 font-medium text-zinc-900">{action.supplier}</dd>
          </div>
        )}
        <div className="col-span-2 flex items-center gap-1.5 text-[11px] text-zinc-500 sm:col-span-2">
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          Expires {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(action.expires_at))}
        </div>
      </dl>

      {error && (
        <div className="px-4 pb-3">
          <Alert variant="error" title="Action not completed">{error}</Alert>
        </div>
      )}

      {outcome?.status === 'confirmed' && (
        <div className="px-4 pb-4">
          <Alert variant="success" title="Stock change confirmed">
            Final stock is {outcome.final_stock}. Movement #{outcome.movement_id} was recorded exactly once.
          </Alert>
        </div>
      )}

      {outcome?.status === 'cancelled' && (
        <div className="px-4 pb-4">
          <Alert variant="info" title="Action cancelled">No inventory change was made.</Alert>
        </div>
      )}

      {!isSettled && (
        <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 bg-zinc-50/70 px-4 py-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={cancel}
            disabled={isWorking}
            isLoading={cancelMutation.isPending}
            leftIcon={<XCircle className="h-4 w-4" />}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={confirm}
            disabled={isWorking}
            isLoading={confirmMutation.isPending}
            leftIcon={<PackageCheck className="h-4 w-4" />}
          >
            Confirm stock change
          </Button>
        </div>
      )}

      {isSettled && (
        <div className="flex items-center gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-2 text-[11px] font-medium text-zinc-600">
          {outcome.status === 'confirmed' ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
          ) : (
            <Ban className="h-3.5 w-3.5 text-zinc-500" aria-hidden="true" />
          )}
          Action status: {outcome.status}
        </div>
      )}
    </section>
  );
};

