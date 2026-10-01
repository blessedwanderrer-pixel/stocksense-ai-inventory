import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { deriveStockStatus, type StockStatus } from '../../../types/inventory';

interface StockStatusBadgeProps {
  currentStock: number;
  lowStockThreshold: number;
  className?: string;
}

export const StockStatusBadge: React.FC<StockStatusBadgeProps> = ({
  currentStock,
  lowStockThreshold,
  className = '',
}) => {
  const status = deriveStockStatus(currentStock, lowStockThreshold);

  switch (status) {
    case 'out_of_stock':
      return (
        <Badge variant="danger" className={className}>
          Out of stock
        </Badge>
      );
    case 'low_stock':
      return (
        <Badge variant="warning" className={className}>
          Low stock
        </Badge>
      );
    case 'in_stock':
      return (
        <Badge variant="success" className={className}>
          In stock
        </Badge>
      );
  }
};
