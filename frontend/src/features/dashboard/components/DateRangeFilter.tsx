import React, { useState } from 'react';
import type { DatePreset } from '../../../types/dashboard';
import { getDateRangeFromPreset } from '../../../lib/dateUtils';
import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string;
  endDate: string;
  preset: DatePreset;
  onChange: (range: { startDate: string; endDate: string; preset: DatePreset }) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  preset,
  onChange,
}) => {
  const [showCustomInputs, setShowCustomInputs] = useState(preset === 'custom');
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const presets: { id: DatePreset; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'this_week', label: 'This Week' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'custom', label: 'Custom' },
  ];

  const handlePresetClick = (newPreset: DatePreset) => {
    if (newPreset === 'custom') {
      setShowCustomInputs(true);
      onChange({ startDate: customStart, endDate: customEnd, preset: 'custom' });
    } else {
      setShowCustomInputs(false);
      const dates = getDateRangeFromPreset(newPreset);
      onChange({ ...dates, preset: newPreset });
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd && customEnd >= customStart) {
      onChange({ startDate: customStart, endDate: customEnd, preset: 'custom' });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Segmented Preset Controls */}
      <div
        role="group"
        aria-label="Date range presets"
        className="inline-flex items-center p-0.5 bg-zinc-100 rounded-lg border border-zinc-200"
      >
        {presets.map((p) => {
          const isActive = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetClick(p.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                isActive
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Custom Date Pickers */}
      {showCustomInputs && (
        <form onSubmit={handleApplyCustom} className="flex items-center gap-1.5 text-xs">
          <label htmlFor="custom-start-date" className="sr-only">Start Date</label>
          <input
            id="custom-start-date"
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1 text-xs border border-zinc-300 rounded-md bg-white text-zinc-800"
          />
          <span className="text-zinc-400">to</span>
          <label htmlFor="custom-end-date" className="sr-only">End Date</label>
          <input
            id="custom-end-date"
            type="date"
            value={customEnd}
            min={customStart}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1 text-xs border border-zinc-300 rounded-md bg-white text-zinc-800"
          />
          <button
            type="submit"
            className="px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
          >
            Apply
          </button>
        </form>
      )}

      {/* Active Range Date Display */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-zinc-500 ml-auto">
        <Calendar className="w-3.5 h-3.5 text-zinc-400" />
        <span className="font-mono text-[11px]">{startDate}</span>
        <span>→</span>
        <span className="font-mono text-[11px]">{endDate}</span>
      </div>
    </div>
  );
};
