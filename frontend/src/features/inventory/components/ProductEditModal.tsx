import React, { useState, useEffect } from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FormField } from '../../../components/ui/FormField';
import { Alert } from '../../../components/ui/Alert';
import { useAuth } from '../../auth/AuthContext';
import { useUpdateProduct } from '../hooks/useInventoryQueries';
import { Save } from 'lucide-react';
import type { ProductResponse, ProductUpdateRequest } from '../../../types/inventory';

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

interface ProductEditModalProps {
  product: ProductResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const updateMutation = useUpdateProduct();

  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('0');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Sync state when product changes
  useEffect(() => {
    if (product) {
      setCategoryId(String(product.category_id));
      setSku(product.sku);
      setName(product.name);
      setDescription(product.description || '');
      setLowStockThreshold(String(product.low_stock_threshold));
      setSellingPrice(product.selling_price);
      setCostPrice(product.cost_price || '');
      setFormError(null);
    }
  }, [product]);

  // Manager-only guard
  if (user?.role !== 'manager' || !product) {
    return null;
  }

  const validatePrice = (val: string) => /^\d{1,10}(\.\d{1,2})?$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload: ProductUpdateRequest = {};
    let hasChanges = false;

    // Category ID
    const parsedCat = parsePositiveInteger(categoryId);
    if (parsedCat === null) {
      setFormError('Category ID must be a positive integer greater than 0.');
      return;
    }
    if (parsedCat !== product.category_id) {
      payload.category_id = parsedCat;
      hasChanges = true;
    }

    // SKU
    const trimmedSku = sku.trim();
    if (!trimmedSku) {
      setFormError('SKU cannot be empty.');
      return;
    }
    if (trimmedSku !== product.sku) {
      payload.sku = trimmedSku;
      hasChanges = true;
    }

    // Name
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Product name cannot be empty.');
      return;
    }
    if (trimmedName !== product.name) {
      payload.name = trimmedName;
      hasChanges = true;
    }

    // Description
    const trimmedDesc = description.trim();
    const origDesc = product.description || '';
    if (trimmedDesc !== origDesc) {
      payload.description = trimmedDesc ? trimmedDesc : null;
      hasChanges = true;
    }

    // Low-stock threshold
    const parsedThreshold = parseNonNegativeInteger(lowStockThreshold);
    if (parsedThreshold === null) {
      setFormError('Low-stock threshold must be 0 or greater.');
      return;
    }
    if (parsedThreshold !== product.low_stock_threshold) {
      payload.low_stock_threshold = parsedThreshold;
      hasChanges = true;
    }

    // Selling price
    const trimmedSellingPrice = sellingPrice.trim();
    if (!trimmedSellingPrice || !validatePrice(trimmedSellingPrice)) {
      setFormError('Selling price must be a valid non-negative number with at most two decimal places.');
      return;
    }
    if (trimmedSellingPrice !== product.selling_price) {
      payload.selling_price = trimmedSellingPrice;
      hasChanges = true;
    }

    // Cost price (manager only; cannot be explicitly sent as null)
    const trimmedCostPrice = costPrice.trim();
    const origCost = product.cost_price || '';
    if (trimmedCostPrice !== origCost && trimmedCostPrice) {
      if (!validatePrice(trimmedCostPrice)) {
        setFormError('Cost price must be a valid non-negative number with at most two decimal places.');
        return;
      }
      payload.cost_price = trimmedCostPrice;
      hasChanges = true;
    }

    if (!hasChanges) {
      setFormError('At least one field must be modified to update the product.');
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: product.id, payload });
      onClose();
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update product.';
      setFormError(message);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Product"
      description={`Update specifications for ${product.name} (SKU: ${product.sku})`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <Alert variant="error" title="Update Error">
            {formError}
          </Alert>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="edit-category-id"
            label="Category ID"
            required
            hint="Positive integer referencing an existing category ID"
          >
            <Input
              id="edit-category-id"
              type="number"
              min="1"
              step="1"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={updateMutation.isPending}
              required
            />
          </FormField>

          <FormField id="edit-sku" label="SKU" required>
            <Input
              id="edit-sku"
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              disabled={updateMutation.isPending}
              required
            />
          </FormField>
        </div>

        <FormField id="edit-name" label="Product Name" required>
          <Input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={updateMutation.isPending}
            required
          />
        </FormField>

        <FormField id="edit-description" label="Description" hint="Optional description (clearing sets to null)">
          <textarea
            id="edit-description"
            rows={2}
            className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={updateMutation.isPending}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField id="edit-selling-price" label="Selling price" required>
            <Input
              id="edit-selling-price"
              type="text"
              inputMode="decimal"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              disabled={updateMutation.isPending}
              required
            />
          </FormField>

          <FormField id="edit-cost-price" label="Cost price" hint="Manager-only">
            <Input
              id="edit-cost-price"
              type="text"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              disabled={updateMutation.isPending}
            />
          </FormField>

          <FormField id="edit-threshold" label="Low-Stock Threshold">
            <Input
              id="edit-threshold"
              type="number"
              min="0"
              step="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
              disabled={updateMutation.isPending}
            />
          </FormField>
        </div>

        <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={updateMutation.isPending}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
