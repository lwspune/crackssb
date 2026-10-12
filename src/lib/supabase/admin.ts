import { createClient } from '@supabase/supabase-js';

/**
 * The service-role client. Bypasses row level security — use only after the
 * caller has been authorized (e.g. can_create_person). The key has no
 * NEXT_PUBLIC_ prefix, so Next never ships it to the browser; importing this
 * from client code would get an undefined key, not the secret.
 */
export function createSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
