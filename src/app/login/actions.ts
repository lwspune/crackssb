'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { homeFor, parseCredentials, safeNext } from '@/lib/auth/routing.ts';
import type { Role } from '@/lib/auth/routing.ts';
import type { LoginState } from '@/ui/auth/LoginForm.tsx';

const WRONG = 'Email or password is wrong.';

export async function signIn(_state: LoginState, form: FormData): Promise<LoginState> {
  const creds = parseCredentials(form);
  if (!creds.ok) return { error: creds.error };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email: creds.email, password: creds.password });
  if (error || !data.user) {
    // A wrong password is expected; anything else is the auth service failing, and is logged.
    if (error && error.code !== 'invalid_credentials') console.error('sign-in failed', { code: error.code, status: error.status });
    // Same words either way, so the form never reveals which emails have an account.
    return { error: error?.code === 'invalid_credentials' || !error ? WRONG : 'Sign-in is unavailable right now. Try again in a minute.' };
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

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect('/login');
}
