// Supabase Configuration
// Note: Environment variables aren't working, so using direct values
// Keep .env file for future use in case the issue gets resolved

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://(insert code for supabase).supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '(insert api key here)'
};
