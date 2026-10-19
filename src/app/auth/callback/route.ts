import { NextResponse, type NextRequest } from 'next/server';
import { googleCallbackFailure, homeFor, safeNext } from '@/lib/auth/routing.ts';
import type { GoogleFailure, Role } from '@/lib/auth/routing.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';

/**
 * Google sends the browser back here (D42). Exchange the code for a session,
 * then send the user where their role belongs. A first Google sign-in already
 * has its profile: the database made it with the account (0020). An account
 * without one can do nothing (0001), so it is signed out again.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const toLogin = (why: GoogleFailure) => NextResponse.redirect(new URL(`/login?error=${why}`, origin));

  const failure = googleCallbackFailure(searchParams);
  if (failure) return toLogin(failure);

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(searchParams.get('code')!);
  if (error || !data.user) {
    // A switched-off login (D31) is expected; anything else is the auth service failing, and is logged.
    if (error?.code !== 'user_banned') console.error('google sign-in failed', { code: error?.code, status: error?.status });
    return toLogin('failed');
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return toLogin('not_set_up');
  }

  const role = profile.role as Role;
  return NextResponse.redirect(new URL(safeNext(searchParams.get('next'), role) ?? homeFor(role), origin));
}
