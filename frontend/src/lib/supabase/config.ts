export interface FrontendConfig {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  isConfigured: boolean;
}

export function getFrontendConfig(): FrontendConfig {
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  const isConfigured = Boolean(
    supabaseUrl &&
    supabasePublishableKey &&
    supabaseUrl !== 'https://your-project.supabase.co' &&
    supabasePublishableKey !== 'your-supabase-publishable-key'
  );

  return {
    apiBaseUrl,
    supabaseUrl,
    supabasePublishableKey,
    isConfigured,
  };
}

export function validateRequiredConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  const cfg = getFrontendConfig();

  if (!cfg.supabaseUrl || cfg.supabaseUrl === 'https://your-project.supabase.co') {
    missing.push('VITE_SUPABASE_URL');
  }
  if (!cfg.supabasePublishableKey || cfg.supabasePublishableKey === 'your-supabase-publishable-key') {
    missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
