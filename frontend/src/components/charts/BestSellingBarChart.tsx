import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import type { BestSellingProduct } from '../../types/dashboard';

interface BestSellingBarChartProps {
  data: BestSellingProduct[];
}

export const BestSellingBarChart: React.FC<BestSellingBarChartProps> = ({ data }) => {
  if (data.length === 0) return null;

  // Format data for chart display (take top 8 products)
  const chartData = data.slice(0, 8).map((item) => ({
    name: item.name.length > 15 ? `${item.name.slice(0, 15)}...` : item.name,
    fullName: item.name,
    sku: item.sku,
    quantity: item.total_quantity_sold,
  }));

  return (
    <div className="w-full h-64 pt-2" aria-label="Best selling products ranked bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
        >
          <XAxis
            type="number"
            tickLine={false}
            axisLine={{ stroke: '#e4e4e7' }}
            tick={{ fontSize: 11, fill: '#71717a' }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fill: '#27272a' }}
            width={110}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as {
                  fullName: string;
                  sku: string;
                  quantity: number;
                };
                return (
                  <div className="bg-zinc-900 text-white text-xs rounded-md px-3 py-2 shadow-md">
                    <p className="font-semibold">{item.fullName}</p>
                    <p className="text-zinc-400 font-mono text-[11px] mb-1">SKU: {item.sku}</p>
                    <p className="text-emerald-400 font-medium">
                      Units Sold: <span className="font-bold">{item.quantity}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={index === 0 ? '#059669' : index < 3 ? '#10b981' : '#34d399'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
