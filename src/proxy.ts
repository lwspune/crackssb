import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { entryFor } from './lib/auth/routing.ts';

/**
 * Runs before every page. Two jobs, both cheap (Next.js: proxy is for
 * optimistic checks, never the authorization itself):
 *   1. Refresh the Supabase session cookie (Supabase's pattern — getClaims
 *      must run here, right after the client is made).
 *   2. Route by session (entryFor): a visitor with none sees the landing page
 *      at / and is sent to /login for anything private, remembering where
 *      they were going. Which ROLE may see a page is decided by the page, through
 *      src/lib/auth/viewer.ts, and by row level security underneath it.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const { pathname, search } = request.nextUrl;

  const entry = entryFor(pathname, Boolean(data?.claims));
  if (entry.kind === 'pass') return response;

  const url = request.nextUrl.clone();
  if (entry.kind === 'login') {
    url.pathname = '/login';
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
  } else {
    url.pathname = entry.to;
  }
  const routed = entry.kind === 'rewrite' ? NextResponse.rewrite(url, { request }) : NextResponse.redirect(url);
  for (const cookie of response.cookies.getAll()) routed.cookies.set(cookie);
  return routed;
}

export const config = {
  // Every page, not static files, images or documents (the blank PPDT sheet is public, as /sheets/ is).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf)$).*)'],
};
