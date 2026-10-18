'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { deletePerson, setActive, setPassword } from '@/db/admin/manage.ts';
import { isMinor } from '@/lib/age.ts';
import { getViewer } from '@/lib/auth/viewer.ts';
import { parsePhone } from '@/lib/phone.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import type { ManageState, PasswordState } from '@/ui/staff/PersonManage.tsx';
import { toIsoDate } from '@/ui/staff/people-lines.ts';

/**
 * Managing one person (D31). Each action shapes the input and the message;
 * the database decides (can_manage_person, as the signed-in caller), and
 * only its yes licenses a service-role write to the login.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENDED = 'Your session has ended. Sign in again.';
const REFUSED = 'You cannot change this person.';

const refresh = (target: string) => {
  revalidatePath(`/staff/people/${target}`);
  revalidatePath('/staff/people');
  revalidatePath('/admin/academies', 'layout');
};

/** A database refusal or failure, as words. Anything unexpected is logged. */
function failed(where: string, error: { message: string; code?: string }): ManageState {
  if (/not_allowed/.test(error.message)) return { kind: 'error', message: REFUSED };
  if (/dob_required/.test(error.message)) return { kind: 'error', message: 'A candidate needs a date of birth.' };
  console.error(`${where} failed`, { code: error.code });
  return { kind: 'error', message: 'Could not save. Try again.' };
}

export async function saveDetails(target: string, _state: ManageState, form: FormData): Promise<ManageState> {
  if (!(await getViewer())) return { kind: 'error', message: ENDED };
  if (!UUID.test(target)) return { kind: 'error', message: REFUSED };

  const fullName = String(form.get('fullName') ?? '').trim();
  if (fullName.length < 1 || fullName.length > 120) return { kind: 'error', message: 'Give a name (up to 120 characters).' };
  const dobRaw = String(form.get('dob') ?? '').trim();
  const dob = dobRaw === '' ? null : toIsoDate(dobRaw);
  if (dobRaw !== '' && !dob) return { kind: 'error', message: 'The date of birth is not a real past date.' };
  const phone = parsePhone(String(form.get('phone') ?? ''));
  if (!phone.ok) return { kind: 'error', message: 'That is not a mobile number. Add +code for outside India.' };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.rpc('update_person', { p_target: target, p_full_name: fullName, p_dob: dob, p_phone: phone.phone });
  if (error) return failed('update_person', error);
  refresh(target);
  return { kind: 'saved', message: 'Saved.' };
}

export async function setPersonPassword(target: string, _state: PasswordState, form: FormData): Promise<PasswordState> {
  if (!(await getViewer())) return { kind: 'error', message: ENDED };
  if (!UUID.test(target)) return { kind: 'error', message: REFUSED };

  const caller = await createSupabaseServer();
  const result = await setPassword(caller, createSupabaseAdmin(), { target, password: String(form.get('password') ?? '') });
  if (result.kind === 'forbidden') return { kind: 'error', message: REFUSED };
  if (result.kind === 'invalid') return { kind: 'error', message: result.error };

  const { data: p } = await caller.from('profiles').select('full_name, email, phone, role, dob, guardian_consent_at').eq('id', target).single();
  if (!p) return { kind: 'error', message: REFUSED };
  const needsConsent = p.role === 'candidate' && p.dob !== null && isMinor(p.dob) && p.guardian_consent_at === null;
  return { kind: 'done', login: { fullName: p.full_name, email: p.email, password: String(form.get('password')), needsConsent }, phone: p.phone };
}

export async function recordConsent(target: string): Promise<ManageState> {
  if (!(await getViewer())) return { kind: 'error', message: ENDED };
  if (!UUID.test(target)) return { kind: 'error', message: REFUSED };
  const { error } = await (await createSupabaseServer()).rpc('record_guardian_consent', { p_target: target });
  if (error) return failed('record_guardian_consent', error);
  refresh(target);
  return { kind: 'saved', message: 'Recorded. Tests are unlocked.' };
}

export async function savePersonRole(target: string, _state: ManageState, form: FormData): Promise<ManageState> {
  if (!(await getViewer())) return { kind: 'error', message: ENDED };
  const role = String(form.get('role') ?? '');
  if (!UUID.test(target) || (role !== 'mentor' && role !== 'org_admin')) return { kind: 'error', message: REFUSED };
  const { error } = await (await createSupabaseServer()).rpc('set_person_role', { p_target: target, p_role: role });
  if (error) return failed('set_person_role', error);
  refresh(target);
  return { kind: 'saved', message: 'Saved.' };
}

export async function setPersonActive(target: string, _state: ManageState, form: FormData): Promise<ManageState> {
  if (!(await getViewer())) return { kind: 'error', message: ENDED };
  if (!UUID.test(target)) return { kind: 'error', message: REFUSED };
  const active = form.get('active') === 'on';
  const result = await setActive(await createSupabaseServer(), createSupabaseAdmin(), { target, active });
  if (result.kind === 'forbidden') return { kind: 'error', message: REFUSED };
  if (result.kind === 'invalid') return { kind: 'error', message: result.error };
  refresh(target);
  return { kind: 'saved', message: active ? 'Switched on.' : 'Switched off.' };
}

export async function removePerson(target: string): Promise<ManageState> {
  if (!(await getViewer())) return { kind: 'error', message: ENDED };
  if (!UUID.test(target)) return { kind: 'error', message: REFUSED };
  const result = await deletePerson(await createSupabaseServer(), createSupabaseAdmin(), { target });
  if (result.kind === 'forbidden') return { kind: 'error', message: 'Only a login nobody has used can be removed. Switch it off instead.' };
  if (result.kind === 'invalid') return { kind: 'error', message: result.error };
  refresh(target);
  redirect('/staff/people');
}
