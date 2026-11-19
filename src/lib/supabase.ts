import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getMiloApiUrl(): string | null {
  const customUrl = import.meta.env.VITE_MILO_API_URL?.trim();
  if (customUrl) return customUrl;
  if (supabaseUrl) {
    return `${supabaseUrl.replace(/\/$/, '')}/functions/v1/milo-chat`;
  }
  return null;
}
