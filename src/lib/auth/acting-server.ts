import { cache } from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServer } from '../supabase/server.ts';
import { ACTING_ORG_COOKIE, actingAcademy } from './acting.ts';
import type { Viewer } from './viewer.ts';

export interface Academy {
  readonly id: string;
  readonly name: string;
}

/**
 * The staff area's academy for this request (D25), with the academies the
 * viewer can see — every one for the superadmin, their own for staff (row
 * level security, 0001). Server-only.
 */
export const getActingAcademy = cache(async (viewer: Viewer): Promise<{ academies: Academy[]; acting: Academy | null }> => {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.from('organisations').select('id, name').order('name');
  if (error) console.error('academies read failed', { code: error.code });
  const academies = (data ?? []) as Academy[];
  const picked = (await cookies()).get(ACTING_ORG_COOKIE)?.value ?? null;
  const id = actingAcademy(viewer, picked, academies.map((a) => a.id));
  return { academies, acting: academies.find((a) => a.id === id) ?? null };
});
