import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AccountPlan = 'free' | 'pro';

export interface UserRecord {
  id: string;
  email: string;
  plan: AccountPlan;
  comped: boolean;
  onboarded: boolean;
  created_at: string;
  updated_at: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
