import { createClient } from '@supabase/supabase-js';
import { SafeStorage } from './safeStorage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://acjcnusbzfjulcigmlwd.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjamNudXNiemZqdWxjaWdtbHdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyOTAwNzUsImV4cCI6MjEwNTg2NjA3NX0.jadhSK6wC76Is8390rKPmhe2BjDydZFkgWAPaz-vnwU';

export const isSupabaseConfigured = () => {
  return (
    Boolean(SUPABASE_URL) &&
    Boolean(SUPABASE_ANON_KEY) &&
    !SUPABASE_URL.includes('xyzcompany')
  );
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: SafeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
