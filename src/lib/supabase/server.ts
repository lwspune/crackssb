import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * The signed-in user's Supabase client for Server Components and Server
 * Actions. Carries the user's session from cookies, so every query runs under
 * row level security as that user. (Supabase's Next.js pattern.)
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, which cannot write cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}
