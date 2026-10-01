import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { InventoryKpiGrid } from '../features/dashboard/components/InventoryKpiGrid';
import { LowStockPanel } from '../features/dashboard/components/LowStockPanel';
import { BestSellingWidget } from '../features/dashboard/components/BestSellingWidget';

export const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operational Reports"
        description="Catalog inventory levels, low-stock threshold triggers, and sales volume velocity."
        showRefresh={true}
      />

      {/* 4 Inventory KPI Summary Cards */}
      <InventoryKpiGrid />

      {/* Two-Column Reporting Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <LowStockPanel />
        <BestSellingWidget />
      </div>
    </div>
  );
};
