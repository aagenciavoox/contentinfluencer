/// <reference types="vite/client" />
import {createClient, SupabaseClient} from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigStatus = {
  url: Boolean(supabaseUrl),
  anonKey: Boolean(supabaseAnonKey),
};

export const isSupabaseConfigured =
  supabaseConfigStatus.url && supabaseConfigStatus.anonKey;

const fetchWithoutHttpCache: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: 'no-store',
  });

export const supabase: SupabaseClient | null =
  isSupabaseConfigured
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          fetch: fetchWithoutHttpCache,
        },
      })
    : null;
