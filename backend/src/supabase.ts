import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

// false until both values are in .env
export const supabaseReady = Boolean(url && anonKey);

// A Supabase client that acts as the logged-in user.
// It sends the user's token, so the database's row-level security only lets
// them read and write their own rows. No service-role key is needed.
export function supabaseFor(token: string) {
  return createClient(url!, anonKey!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
