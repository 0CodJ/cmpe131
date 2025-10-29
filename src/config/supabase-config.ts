// Supabase Configuration
// Note: Environment variables aren't working, so using direct values
// Keep .env file for future use in case the issue gets resolved

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || 'https://wvveeyfcfstpotptvjen.supabase.co',
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2dmVleWZjZnN0cG90cHR2amVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzE2NDgsImV4cCI6MjA3NjY0NzY0OH0.L4b6g8pQlwSwWhM-wP9OGsPOMlkBvbgbYMXgb-P_o6M'
};
