import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FormField } from '../../../components/ui/FormField';
import { Alert } from '../../../components/ui/Alert';
import { useProducts, useRecordStockMovement } from '../hooks/useInventoryQueries';
import { ArrowDownLeft, ArrowUpRight, AlertOctagon, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { ProductResponse } from '../../../types/inventory';
import type { StockMovementType, StockMovementCreateRequest } from '../../../types/movements';

const parsePositiveInteger = (value: string): number | null => {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

interface StockOperationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProduct?: ProductResponse | null;
  onSuccess?: () => void;
}

export const StockOperationModal: React.FC<StockOperationModalProps> = ({
  isOpen,
  onClose,
  initialProduct,
  onSuccess,
}) => {
  const { data: products } = useProducts();
  const movementMutation = useRecordStockMovement();

  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    initialProduct?.id || null
  );
  const [movementType, setMovementType] = useState<StockMovementType>('stock_in');
  const [quantity, setQuantity] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // Sync initialProduct
  useEffect(() => {
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
    } else if (products && products.length > 0 && selectedProductId === null) {
      setSelectedProductId(products[0].id);
    }
  }, [initialProduct, products]);

  // Find currently selected product object
  const currentProduct = products?.find((p) => p.id === selectedProductId);

  // Clear supplier state when movement type changes away from stock_in
  const handleMovementTypeChange = (type: StockMovementType) => {
    setMovementType(type);
    if (type !== 'stock_in') {
      setSupplierId('');
    }
    setFormError(null);
    setIsConfirming(false);
  };

  const handleReset = () => {
    setQuantity('');
    setSupplierId('');
    setFormError(null);
    setSuccessMessage(null);
    setIsConfirming(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Preview resulting stock
  const parsedQty = parsePositiveInteger(quantity);
  const currentStock = currentProduct?.current_stock ?? 0;

  let projectedStock = currentStock;
  if (parsedQty !== null) {
    if (movementType === 'stock_in') projectedStock = currentStock + parsedQty;
    else projectedStock = currentStock - parsedQty;
  }

  const isStockReducing = movementType === 'sale' || movementType === 'damaged';
  const hasInsufficientStockWarning =
    isStockReducing && parsedQty !== null && parsedQty > currentStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!selectedProductId || selectedProductId <= 0) {
      setFormError('Please select a valid product.');
      return;
    }

    const submitQty = parsePositiveInteger(quantity);
    if (submitQty === null) {
      setFormError('Quantity must be a positive integer greater than 0.');
      return;
    }

    // Accessible confirmation step for stock-reducing operations
    if (isStockReducing && !isConfirming) {
      setIsConfirming(true);
      return;
    }

    const payload: StockMovementCreateRequest = {
      product_id: selectedProductId,
      movement_type: movementType,
      quantity: submitQty,
    };

    // supplier_id allowed ONLY for stock_in
    if (movementType === 'stock_in' && supplierId.trim()) {
      const parsedSupId = parsePositiveInteger(supplierId);
      if (parsedSupId === null) {
        setFormError('Supplier ID must be a positive integer greater than 0.');
        return;
      }
      payload.supplier_id = parsedSupId;
    }

    try {
      await movementMutation.mutateAsync(payload);
      setQuantity('');
      setSupplierId('');
      setFormError(null);
      setIsConfirming(false);
      setSuccessMessage(
        `Successfully recorded ${movementType === 'stock_in' ? 'Stock In' : movementType === 'sale' ? 'Sale' : 'Damaged Stock'} for ${currentProduct?.name || 'product'}.`
      );
      onSuccess?.();
    } catch (err: unknown) {
      setIsConfirming(false);
      const message =
        err instanceof Error
          ? err.message
          : 'Operation failed. If reducing stock, verify inventory availability.';
      setFormError(message);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Record Stock Movement"
      description="Record physical stock arrivals, customer sales, or damaged inventory."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {successMessage && (
          <Alert variant="success" title="Movement Recorded" onClose={() => setSuccessMessage(null)}>
            {successMessage}
          </Alert>
        )}

        {formError && (
          <Alert variant="error" title="Operation Failed">
            {formError}
          </Alert>
        )}

        {/* Product Selector */}
        <FormField id="movement-product" label="Product" required>
          <select
            id="movement-product"
            value={selectedProductId || ''}
            onChange={(e) => {
              setSelectedProductId(Number(e.target.value));
              setFormError(null);
              setIsConfirming(false);
            }}
            disabled={movementMutation.isPending || !!initialProduct}
            className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600 disabled:bg-zinc-100"
          >
            {products?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (SKU: {p.sku}) — {p.current_stock} in stock
              </option>
            ))}
          </select>
        </FormField>

        {currentProduct && (
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between text-xs">
            <div>
              <span className="text-zinc-500">Selected Product:</span>
              <p className="font-semibold text-zinc-900">{currentProduct.name}</p>
            </div>
            <div className="text-right">
              <span className="text-zinc-500">Current Stock:</span>
              <p className="font-mono font-bold text-zinc-900">{currentProduct.current_stock}</p>
            </div>
          </div>
        )}

        {/* Movement Type Segmented Selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-700">Movement Type *</label>
          <div
            role="radiogroup"
            aria-label="Stock Movement Type"
            className="grid grid-cols-3 gap-2"
          >
            <button
              type="button"
              role="radio"
              aria-checked={movementType === 'stock_in'}
              onClick={() => handleMovementTypeChange('stock_in')}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-colors ${
                movementType === 'stock_in'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs font-semibold'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4 text-emerald-600 mb-1" />
              Stock In
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={movementType === 'sale'}
              onClick={() => handleMovementTypeChange('sale')}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-colors ${
                movementType === 'sale'
                  ? 'bg-zinc-100 border-zinc-700 text-zinc-900 shadow-2xs font-semibold'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-zinc-700 mb-1" />
              Sale
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={movementType === 'damaged'}
              onClick={() => handleMovementTypeChange('damaged')}
              className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-colors ${
                movementType === 'damaged'
                  ? 'bg-red-50 border-red-500 text-red-800 shadow-2xs font-semibold'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <AlertOctagon className="w-4 h-4 text-red-600 mb-1" />
              Damaged
            </button>
          </div>
        </div>

        {/* Quantity */}
        <FormField
          id="movement-quantity"
          label="Quantity"
          required
          hint="Positive integer count to record"
        >
          <Input
            id="movement-quantity"
            type="number"
            min="1"
            step="1"
            placeholder="e.g. 5"
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setIsConfirming(false);
            }}
            disabled={movementMutation.isPending}
            required
          />
        </FormField>

        {/* Supplier ID: visible ONLY for stock_in */}
        {movementType === 'stock_in' && (
          <FormField
            id="movement-supplier-id"
            label="Supplier ID (Optional)"
            hint="Positive integer referencing an existing supplier ID"
          >
            <Input
              id="movement-supplier-id"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 1"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={movementMutation.isPending}
            />
          </FormField>
        )}

        {/* Warning if stock would be insufficient */}
        {hasInsufficientStockWarning && (
          <Alert variant="warning" title="Negative Stock Warning">
            Entered quantity ({parsedQty}) exceeds current stock ({currentStock}). The backend will reject this movement without changing stock.
          </Alert>
        )}

        {/* Informative Preview (clearly labeled) */}
        {parsedQty !== null && (
          <div className="p-3 bg-zinc-100 rounded-lg text-xs text-zinc-600 flex items-center justify-between">
            <span className="font-medium">Estimated Stock Preview:</span>
            {hasInsufficientStockWarning ? (
              <span className="font-semibold text-red-700">Would be rejected — no stock change</span>
            ) : (
              <span className="font-mono font-bold text-zinc-900">
                {currentStock} → {projectedStock}
              </span>
            )}
          </div>
        )}

        {/* Confirmation Banner for stock reduction */}
        {isConfirming && isStockReducing && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Confirm Stock Reduction
            </p>
            <p>
              Are you sure you want to deduct <strong>{parsedQty} units</strong> from {currentProduct?.name}? Click Submit again to confirm.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={movementMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={movementType === 'damaged' ? 'danger' : 'primary'}
            size="sm"
            isLoading={movementMutation.isPending}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            {isConfirming ? 'Confirm & Submit' : 'Submit Movement'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
