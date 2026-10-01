import React, { useState } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { ProductTable } from '../features/inventory/components/ProductTable';
import { ProductDetailModal } from '../features/inventory/components/ProductDetailModal';
import { ProductCreateModal } from '../features/inventory/components/ProductCreateModal';
import { ProductEditModal } from '../features/inventory/components/ProductEditModal';
import { StockOperationModal } from '../features/inventory/components/StockOperationModal';
import { useProducts } from '../features/inventory/hooks/useInventoryQueries';
import { useAuth } from '../features/auth/AuthContext';
import { PlusCircle, ArrowLeftRight } from 'lucide-react';
import type { ProductResponse } from '../types/inventory';

export const InventoryPage: React.FC = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const { data: products, isLoading, isError, refetch } = useProducts();

  // Modal states
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMovementOpen, setIsMovementOpen] = useState(false);
  const [movementInitialProduct, setMovementInitialProduct] = useState<ProductResponse | null>(null);

  const handleView = (product: ProductResponse) => {
    setSelectedProduct(product);
    setIsDetailOpen(true);
  };

  const handleEdit = (product: ProductResponse) => {
    if (!isManager) return;
    setSelectedProduct(product);
    setIsEditOpen(true);
  };

  const handleRecordMovement = (product?: ProductResponse) => {
    setMovementInitialProduct(product || null);
    setIsMovementOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Inventory Catalog"
        description="Real-time physical stock directory, SKU threshold monitoring, and pricing."
        showRefresh={true}
        actions={
          <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRecordMovement()}
            leftIcon={<ArrowLeftRight className="w-4 h-4" />}
          >
            Record Movement
          </Button>

          {/* Manager-only Add Product */}
          {isManager && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Add Product
            </Button>
          )}
          </div>
        }
      />

      {/* Main Inventory Table */}
      <ProductTable
        products={products as ProductResponse[] | undefined}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        onViewProduct={handleView}
        onEditProduct={isManager ? handleEdit : undefined}
        onRecordMovement={handleRecordMovement}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        productId={selectedProduct?.id || null}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProduct(null);
        }}
        onEdit={isManager ? handleEdit : undefined}
        onRecordMovement={handleRecordMovement}
      />

      {/* Manager-only Create Product Modal */}
      {isManager && (
        <ProductCreateModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => refetch()}
        />
      )}

      {/* Manager-only Edit Product Modal */}
      {isManager && (
        <ProductEditModal
          product={selectedProduct}
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => refetch()}
        />
      )}

      {/* Shared Stock Operation Modal */}
      <StockOperationModal
        isOpen={isMovementOpen}
        onClose={() => {
          setIsMovementOpen(false);
          setMovementInitialProduct(null);
        }}
        initialProduct={movementInitialProduct}
        onSuccess={() => refetch()}
      />
    </div>
  );
};
