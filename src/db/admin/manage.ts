import type { SupabaseClient } from '@supabase/supabase-js';
import { passwordProblem } from '../../lib/auth/password.ts';

/**
 * Managing a person after they are created (migration 0008, D31): the parts
 * that touch the LOGIN, which only the service role can change. Details,
 * consent and role are profile writes the database functions make as the
 * caller; the actions call those directly.
 *
 * AUTHORIZATION FIRST, AS THE CALLER, exactly as createPeople: `caller` is the
 * signed-in user's own client, and only the database's "yes" licenses the
 * service-role write after it.
 *
 * Not "server-only": the database tests import it. Called only from Server
 * Actions.
 */

export type ManageResult = { readonly kind: 'ok' } | { readonly kind: 'forbidden' } | { readonly kind: 'invalid'; readonly error: string };

export type ManageAction = 'edit' | 'password' | 'deactivate' | 'delete' | 'role';

export async function mayManage(caller: SupabaseClient, target: string, action: ManageAction): Promise<boolean> {
  const { data, error } = await caller.rpc('can_manage_person', { p_target: target, p_action: action });
  return !error && data === true;
}

/** Long enough that it never runs out: the auth server has no "forever". */
const BANNED = '876000h';

export async function setPassword(caller: SupabaseClient, service: SupabaseClient, input: { target: string; password: string }): Promise<ManageResult> {
  if (!(await mayManage(caller, input.target, 'password'))) return { kind: 'forbidden' };
  const { data: who } = await caller.from('profiles').select('email, full_name').eq('id', input.target).single();
  if (!who) return { kind: 'forbidden' };
  const problem = passwordProblem(input.password, { email: who.email, fullName: who.full_name });
  if (problem) return { kind: 'invalid', error: problem };

  const { error } = await service.auth.admin.updateUserById(input.target, { password: input.password });
  if (error) {
    console.error('setPassword: login not updated', { code: error.code });
    return { kind: 'invalid', error: 'Could not set the password. Try again.' };
  }
  return { kind: 'ok' };
}

/**
 * Switch a login off or on. The database records it first (set_person_active,
 * as the caller), and from then on refuses the person every read whatever the
 * auth server does; the ban then stops them signing in. Both steps can be
 * repeated, so a failure is fixed by trying again.
 */
export async function setActive(caller: SupabaseClient, service: SupabaseClient, input: { target: string; active: boolean }): Promise<ManageResult> {
  const { error } = await caller.rpc('set_person_active', { p_target: input.target, p_active: input.active });
  if (error) {
    if (/not_allowed/.test(error.message)) return { kind: 'forbidden' };
    console.error('set_person_active failed', { code: error.code });
    return { kind: 'invalid', error: 'Could not change it. Try again.' };
  }
  const ban = await service.auth.admin.updateUserById(input.target, { ban_duration: input.active ? 'none' : BANNED });
  if (ban.error) {
    console.error('setActive: login ban not changed', { code: ban.error.code });
    return { kind: 'invalid', error: 'Saved, but the login did not change. Try again.' };
  }
  return { kind: 'ok' };
}

/** Remove a login nobody has used: never signed in, no tests, no practice. The database says whether it qualifies. */
export async function deletePerson(caller: SupabaseClient, service: SupabaseClient, input: { target: string }): Promise<ManageResult> {
  if (!(await mayManage(caller, input.target, 'delete'))) return { kind: 'forbidden' };
  const { error } = await service.auth.admin.deleteUser(input.target);
  if (error) {
    console.error('deletePerson: login not removed', { code: error.code });
    return { kind: 'invalid', error: 'Could not remove it. Try again.' };
  }
  return { kind: 'ok' };
}
