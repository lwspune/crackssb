'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getActingAcademy } from '@/lib/auth/acting-server.ts';
import { ACTING_ORG_COOKIE, actingAcademy } from '@/lib/auth/acting.ts';
import { getViewer } from '@/lib/auth/viewer.ts';

/**
 * The superadmin picks which academy the staff area shows (D25). Only a real
 * academy is remembered; anything else is dropped. Staff cannot move: the
 * cookie is never read for them.
 */
export async function pickAcademy(form: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer) redirect('/login?next=%2Fstaff');
  if (viewer.role !== 'superadmin') redirect('/staff/people');

  const { academies } = await getActingAcademy(viewer);
  const id = actingAcademy(viewer, String(form.get('org') ?? ''), academies.map((a) => a.id));
  const jar = await cookies();
  if (id) {
    jar.set(ACTING_ORG_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 90 });
  } else {
    jar.delete(ACTING_ORG_COOKIE);
  }
  redirect('/staff/people');
}
