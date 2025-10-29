import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/supabase-config';

const supabaseUrl = supabaseConfig.url;
const supabaseAnonKey = supabaseConfig.anonKey;

// Create Supabase client with singleton pattern to avoid multiple instances
let supabaseInstance: ReturnType<typeof createClient> | null = null;

const getSupabaseClient = () => {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'cmpe131-auth',
      }
    });
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();

export interface HistoricalEvent {
  id: string;
  title: string;
  description: string;
  month: number;
  day: number;
  year: number;
  category: string;
  created_at: string;
}
