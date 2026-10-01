import type { DatePreset } from '../types/dashboard';

export function formatDateYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateRangeFromPreset(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = formatDateYMD(now);

  switch (preset) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };

    case 'last_7_days': {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      return { startDate: formatDateYMD(past), endDate: todayStr };
    }

    case 'this_week': {
      const past = new Date(now);
      const day = past.getDay();
      const diffToMonday = past.getDate() - day + (day === 0 ? -6 : 1);
      past.setDate(diffToMonday);
      return { startDate: formatDateYMD(past), endDate: todayStr };
    }

    case 'this_month': {
      const past = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatDateYMD(past), endDate: todayStr };
    }

    case 'custom':
    default: {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      return { startDate: formatDateYMD(past), endDate: todayStr };
    }
  }
}
