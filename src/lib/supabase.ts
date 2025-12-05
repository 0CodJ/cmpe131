// This file is deprecated. Use supabaseClient.ts instead.
// Keeping for backwards compatibility with any remaining imports
import { supabase } from './supabaseClient';
export { supabase };

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
