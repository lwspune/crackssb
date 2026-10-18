import type { SupabaseClient } from '@supabase/supabase-js';
import { passwordProblem } from './password.ts';

/**
 * Anyone changes their own password (D31). The current one is checked first,
 * so an unattended signed-in phone is not enough to take the account.
 *
 * `user` is the signed-in user's client; `verifier` is a fresh client with no
 * session, used once to check the current password and signed out again.
 */

export type OwnPasswordResult = { readonly kind: 'ok' } | { readonly kind: 'wrong_current' } | { readonly kind: 'invalid'; readonly error: string };

export async function changeOwnPassword(user: SupabaseClient, verifier: SupabaseClient, input: { current: string; next: string }): Promise<OwnPasswordResult> {
  const { data: me } = await user.auth.getUser();
  const email = me.user?.email;
  if (!email) return { kind: 'invalid', error: 'Your session has ended. Sign in again.' };

  const { data: profile } = await user.from('profiles').select('full_name').eq('id', me.user!.id).maybeSingle();
  const problem = passwordProblem(input.next, { email, fullName: profile?.full_name ?? '' });
  if (problem) return { kind: 'invalid', error: problem };
  if (input.next === input.current) return { kind: 'invalid', error: 'That is the password you have now.' };

  const check = await verifier.auth.signInWithPassword({ email, password: input.current });
  if (check.error) {
    if (check.error.code !== 'invalid_credentials') console.error('changeOwnPassword: check failed', { code: check.error.code });
    return check.error.code === 'invalid_credentials' ? { kind: 'wrong_current' } : { kind: 'invalid', error: 'Could not check your password. Try again.' };
  }
  await verifier.auth.signOut({ scope: 'local' });

  const { error } = await user.auth.updateUser({ password: input.next });
  if (error) {
    console.error('changeOwnPassword: not updated', { code: error.code });
    return { kind: 'invalid', error: 'Could not change it. Try again.' };
  }
  return { kind: 'ok' };
}
