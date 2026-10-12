import { createBrowserClient } from '@supabase/ssr';

/** The signed-in user's client in the browser. Same session as the server, from the same cookies; row level security applies. */
export function createSupabaseBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
