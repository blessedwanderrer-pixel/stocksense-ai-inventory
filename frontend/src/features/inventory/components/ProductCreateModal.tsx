import React, { useState } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FormField } from '../../../components/ui/FormField';
import { Alert } from '../../../components/ui/Alert';
import { useAuth } from '../../auth/AuthContext';
import { useCreateProduct } from '../hooks/useInventoryQueries';
import { PlusCircle, Info } from 'lucide-react';
import type { ProductCreateRequest } from '../../../types/inventory';

const parsePositiveInteger = (value: string): number | null => {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseNonNegativeInteger = (value: string): number | null => {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

interface ProductCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProductCreateModal: React.FC<ProductCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const createMutation = useCreateProduct();

  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Manager-only check
  if (user?.role !== 'manager') {
    return null;
  }

  const resetForm = () => {
    setCategoryId('');
    setSku('');
    setName('');
    setDescription('');
    setLowStockThreshold('0');
    setSellingPrice('');
    setCostPrice('');
    setFormError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validatePrice = (val: string) => /^\d{1,10}(\.\d{1,2})?$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsedCategoryId = parsePositiveInteger(categoryId);
    if (parsedCategoryId === null) {
      setFormError('Category ID must be a positive integer greater than 0.');
      return;
    }

    const trimmedSku = sku.trim();
    if (!trimmedSku) {
      setFormError('SKU is required.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Product name is required.');
      return;
    }

    const parsedThreshold = parseNonNegativeInteger(lowStockThreshold);
    if (parsedThreshold === null) {
      setFormError('Low-stock threshold must be 0 or greater.');
      return;
    }

    const trimmedSellingPrice = sellingPrice.trim();
    if (!trimmedSellingPrice || !validatePrice(trimmedSellingPrice)) {
      setFormError('Selling price must be a valid non-negative number with at most two decimal places (e.g. 19.99).');
      return;
    }

    const payload: ProductCreateRequest = {
      category_id: parsedCategoryId,
      sku: trimmedSku,
      name: trimmedName,
      selling_price: trimmedSellingPrice,
      low_stock_threshold: parsedThreshold,
    };

    if (description.trim()) {
      payload.description = description.trim();
    } else {
      payload.description = null;
    }

    const trimmedCostPrice = costPrice.trim();
    if (trimmedCostPrice) {
      if (!validatePrice(trimmedCostPrice)) {
        setFormError('Cost price must be a valid non-negative number with at most two decimal places (e.g. 12.50).');
        return;
      }
      payload.cost_price = trimmedCostPrice;
    }

    try {
      await createMutation.mutateAsync(payload);
      handleClose();
      onSuccess?.();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create product. Check that SKU and Category ID are valid.';
      setFormError(message);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Product"
      description="Add a new catalog item. Initial stock begins at 0 and must be recorded via Stock In."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <Alert variant="error" title="Submission Error">
            {formError}
          </Alert>
        )}

        <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs text-amber-800 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Initial stock is automatically 0. To record incoming inventory, perform a <strong>Stock In</strong> transaction after creation.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="create-category-id"
            label="Category ID"
            required
            hint="Positive integer referencing an existing category ID"
          >
            <Input
              id="create-category-id"
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 1"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={createMutation.isPending}
              required
            />
          </FormField>

          <FormField id="create-sku" label="SKU (Stock Keeping Unit)" required>
            <Input
              id="create-sku"
              type="text"
              placeholder="e.g. SKU-BEV-001"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              disabled={createMutation.isPending}
              required
            />
          </FormField>
        </div>

        <FormField id="create-name" label="Product Name" required>
          <Input
            id="create-name"
            type="text"
            placeholder="e.g. Cold Brew Coffee 330ml"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={createMutation.isPending}
            required
          />
        </FormField>

        <FormField id="create-description" label="Description" hint="Optional catalog description">
          <textarea
            id="create-description"
            rows={2}
            className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
            placeholder="Enter item details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={createMutation.isPending}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField
            id="create-selling-price"
            label="Selling price"
            required
            hint="Decimal (e.g. 19.99)"
          >
            <Input
              id="create-selling-price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              disabled={createMutation.isPending}
              required
            />
          </FormField>

          <FormField
            id="create-cost-price"
            label="Cost price"
            hint="Manager-only (e.g. 12.50)"
          >
            <Input
              id="create-cost-price"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              disabled={createMutation.isPending}
            />
          </FormField>

          <FormField
            id="create-threshold"
            label="Low-Stock Threshold"
            hint="Alert trigger count"
          >
            <Input
              id="create-threshold"
              type="number"
              min="0"
              step="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              disabled={createMutation.isPending}
            />
          </FormField>
        </div>

        <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={createMutation.isPending}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Create Product
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
