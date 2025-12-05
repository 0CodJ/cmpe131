import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabaseConfigValid = Boolean(supabaseUrl && supabaseAnonKey);

if (!supabaseConfigValid) {
  console.warn('Supabase URL or anon key is missing. Check your .env file.');
  console.warn('Create a .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

// Create client with fallback placeholders so the app doesn't crash,
// but Supabase operations will fail until real env vars are provided.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
