'use server';

import { revalidatePath } from 'next/cache';
import { createPeople } from '@/db/admin/people.ts';
import { getViewer } from '@/lib/auth/viewer.ts';
import { ROLES } from '@/lib/auth/routing.ts';
import type { Role } from '@/lib/auth/routing.ts';
import { createSupabaseAdmin } from '@/lib/supabase/admin.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import type { AddPeopleState } from '@/ui/staff/AddPeopleForm.tsx';
import { checkPeople, MAX_PEOPLE } from '@/ui/staff/people-rows.ts';
import type { RawPerson } from '@/ui/staff/people-rows.ts';

const NOUN: Readonly<Record<Role, string>> = { candidate: 'candidates', mentor: 'mentors', org_admin: 'academy owners', superadmin: 'superadmins' };
const FIELDS = ['fullName', 'email', 'dob', 'phone', 'password'] as const;

/** The rows the upload sent, or null if they are not exactly that shape. Nothing from the browser is trusted. */
function uploadedRows(json: string): RawPerson[] | null {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return null;
  }
  if (!Array.isArray(data) || data.length === 0 || data.length > MAX_PEOPLE) return null;
  const ok = data.every(
    (r) => typeof r === 'object' && r !== null && FIELDS.every((f) => typeof (r as Record<string, unknown>)[f] === 'string' && ((r as Record<string, string>)[f]).length <= 300),
  );
  return ok ? data.map((r: Record<string, string>) => ({ fullName: r.fullName, email: r.email, dob: r.dob, phone: r.phone, password: r.password })) : null;
}

/**
 * Add people to an academy (D23, D31): one person from the form's fields, or
 * many from an uploaded sheet. Staff always add to their OWN academy — the
 * target below is ignored for them. A superadmin names the academy; the
 * database decides either way (can_create_person, as the signed-in caller).
 */
export async function addPeople(target: { orgId: string | null }, _state: AddPeopleState, form: FormData): Promise<AddPeopleState> {
  const viewer = await getViewer();
  if (!viewer) return { kind: 'error', message: 'Your session has ended. Sign in again.' };

  const role = String(form.get('role') ?? '');
  if (!ROLES.includes(role as Role)) return { kind: 'error', message: 'Choose a role.' };
  const org = viewer.role === 'superadmin' ? target.orgId : viewer.orgId;

  const mode = form.get('mode');
  const field = (name: string) => String(form.get(name) ?? '');
  const rows: RawPerson[] | null =
    mode === 'one'
      ? [{ fullName: field('fullName'), email: field('email'), dob: field('dob'), phone: field('phone'), password: field('password') }]
      : mode === 'many'
        ? uploadedRows(field('rows'))
        : null;
  if (!rows) return { kind: 'error', message: 'Nothing to add. Upload the file again.' };

  const checked = checkPeople(rows);
  if (checked.errors.length > 0 || checked.people.length === 0) {
    return { kind: 'error', message: mode === 'one' ? checked.errors[0]?.message ?? 'Check the details.' : 'Fix the rows marked, then upload again.' };
  }

  const result = await createPeople(await createSupabaseServer(), createSupabaseAdmin(), {
    org,
    role: role as Role,
    people: checked.people,
    guardianConsent: form.get('guardianConsent') === 'on',
  });
  if (result.kind === 'forbidden') return { kind: 'error', message: `You cannot add ${NOUN[role as Role]} here.` };
  if (result.kind === 'invalid') return { kind: 'error', message: result.error };

  revalidatePath('/staff/people');
  revalidatePath('/admin/academies', 'layout');
  return {
    kind: 'done',
    created: result.created.map(({ fullName, email, password, phone, minorWithoutConsent }) => ({ fullName, email, password, phone, minorWithoutConsent })),
    existing: result.existing,
    failed: result.failed,
  };
}
