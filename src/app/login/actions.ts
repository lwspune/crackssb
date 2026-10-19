'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { GOOGLE_CALLBACK, homeFor, parseCredentials, safeNext, signInError } from '@/lib/auth/routing.ts';
import type { Role } from '@/lib/auth/routing.ts';
import type { LoginState } from '@/ui/auth/LoginForm.tsx';

export async function signIn(_state: LoginState, form: FormData): Promise<LoginState> {
  const creds = parseCredentials(form);
  if (!creds.ok) return { error: creds.error };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password });
  if (error || !data.user) {
    // A wrong password or a switched-off login is expected; anything else is the auth service failing, and is logged.
    if (error && error.code !== 'invalid_credentials' && error.code !== 'user_banned') console.error('sign-in failed', { code: error.code, status: error.status });
    return { error: signInError(error ? error.code : 'invalid_credentials') };
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: 'This login is not set up yet. Ask your academy.' };
  }

  const role = profile.role as Role;
  const next = form.get('next');
  redirect(safeNext(typeof next === 'string' ? next : null, role) ?? homeFor(role));
}

/**
 * Send the browser to Google (D42). The code verifier goes into a cookie here;
 * /auth/callback exchanges Google's code for a session. `next` rides along and
 * is checked there, once the role is known. Next.js has already matched the
 * action's Origin to the host, and Supabase allows only listed return addresses.
 */
export async function signInWithGoogle(form: FormData): Promise<void> {
  const origin = (await headers()).get('origin');
  if (!origin) redirect('/login?error=failed');
  const callback = new URL(GOOGLE_CALLBACK, origin);
  const next = form.get('next');
  if (typeof next === 'string' && next.length <= 300) callback.searchParams.set('next', next);

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: callback.toString() } });
  if (error || !data.url) {
    console.error('google sign-in could not start', { code: error?.code, status: error?.status });
    redirect('/login?error=failed');
  }
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}
