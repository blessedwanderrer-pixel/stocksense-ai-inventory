import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getFrontendConfig } from './config';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const { supabaseUrl, supabasePublishableKey } = getFrontendConfig();
  const url = supabaseUrl || 'https://placeholder-project.supabase.co';
  const key = supabasePublishableKey || 'placeholder-publishable-key';

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseInstance;
}

export const supabase = getSupabase();
