import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { DateRangeFilter } from './DateRangeFilter';
import { BestSellingBarChart } from '../../../components/charts/BestSellingBarChart';
import { useBestSellingReport } from '../hooks/useDashboardQueries';
import { getDateRangeFromPreset } from '../../../lib/dateUtils';
import type { DatePreset } from '../../../types/dashboard';
import { TrendingUp, BarChart2, Table } from 'lucide-react';

export const BestSellingWidget: React.FC = () => {
  const initialRange = getDateRangeFromPreset('last_7_days');
  const [dateRange, setDateRange] = useState({
    startDate: initialRange.startDate,
    endDate: initialRange.endDate,
    preset: 'last_7_days' as DatePreset,
  });
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

  const {
    data: items,
    isLoading,
    isError,
    refetch,
  } = useBestSellingReport(dateRange.startDate, dateRange.endDate);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <CardTitle>Best-Selling Products</CardTitle>
            </div>
            <CardDescription>
              Ranked by total quantity sold in the selected date range
            </CardDescription>
          </div>

          {items && items.length > 0 && (
            <div className="flex items-center self-start sm:self-auto bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                aria-label="Chart view"
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Chart
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-label="Table view"
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                Table
              </button>
            </div>
          )}
        </div>

        <DateRangeFilter
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          preset={dateRange.preset}
          onChange={(newRange) => setDateRange(newRange)}
        />
      </CardHeader>

      <CardContent className="flex-1 pt-3">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        )}

        {isError && (
          <ErrorState
            title="Failed to load best-selling report"
            message="Could not retrieve sales statistics for this date range."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && items && items.length === 0 && (
          <EmptyState
            title="No sales recorded"
            description="No recorded sales were found for this date range."
          />
        )}

        {!isLoading && !isError && items && items.length > 0 && (
          <>
            {viewMode === 'chart' ? (
              <div className="space-y-4">
                <BestSellingBarChart data={items} />
                {/* Accessible text summary for screen readers & quick reference */}
                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
                  <span>Top performer: <strong className="text-zinc-800">{items[0]?.name}</strong></span>
                  <span className="font-mono text-emerald-700 font-medium">{items[0]?.total_quantity_sold} units sold</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                      <th scope="col" className="pb-2 pl-1 w-10">#</th>
                      <th scope="col" className="pb-2">Product</th>
                      <th scope="col" className="pb-2">SKU</th>
                      <th scope="col" className="pb-2 text-right pr-1">Units Sold</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {items.map((prod, index) => (
                      <tr key={prod.product_id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-2.5 pl-1 font-mono text-zinc-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-2.5 font-medium text-zinc-900 max-w-[200px] truncate" title={prod.name}>
                          {prod.name}
                        </td>
                        <td className="py-2.5 font-mono text-zinc-500">
                          {prod.sku}
                        </td>
                        <td className="py-2.5 text-right pr-1 font-mono font-bold text-zinc-900">
                          {prod.total_quantity_sold}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
