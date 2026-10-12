'use server';

import { revalidatePath } from 'next/cache';
import { createPeople } from '@/db/admin/people.ts';
import { getViewer } from '@/lib/auth/viewer.ts';
import { ROLES } from '@/lib/auth/routing.ts';
import type { Role } from '@/lib/auth/routing.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { parsePeopleLines } from '@/ui/staff/people-lines.ts';
import type { AddPeopleState } from '@/ui/staff/AddPeopleForm.tsx';

const NOUN: Readonly<Record<Role, string>> = { candidate: 'candidates', mentor: 'mentors', org_admin: 'academy owners', superadmin: 'superadmins' };

/**
 * Add people to an academy. Staff always add to their OWN academy — the
 * target below is ignored for them. A superadmin names the academy; the
 * database decides either way (can_create_person, as the signed-in caller).
 */
export async function addPeople(target: { orgId: string | null }, _state: AddPeopleState, form: FormData): Promise<AddPeopleState> {
  const viewer = await getViewer();
  if (!viewer) return { kind: 'error', message: 'Your session has ended. Sign in again.' };

  const role = String(form.get('role') ?? '');
  if (!ROLES.includes(role as Role)) return { kind: 'error', message: 'Choose a role.' };
  const org = viewer.role === 'superadmin' ? target.orgId : viewer.orgId;

  const parsed = parsePeopleLines(String(form.get('lines') ?? ''), role as Role);
  if (parsed.errors.length > 0 || parsed.people.length === 0) return { kind: 'error', message: 'Fix the lines marked above, then try again.' };

  const result = await createPeople(await createSupabaseServer(), createSupabaseAdmin(), {
    org,
    role: role as Role,
    people: parsed.people,
    guardianConsent: form.get('guardianConsent') === 'on',
  });
  if (result.kind === 'forbidden') return { kind: 'error', message: `You cannot add ${NOUN[role as Role]} here.` };
  if (result.kind === 'invalid') return { kind: 'error', message: result.error };

  revalidatePath('/staff/people');
  revalidatePath('/admin/academies', 'layout');
  return {
    kind: 'done',
    created: result.created.map(({ fullName, email, password, minorWithoutConsent }) => ({ fullName, email, password, minorWithoutConsent })),
    existing: result.existing,
    failed: result.failed,
  };
}
