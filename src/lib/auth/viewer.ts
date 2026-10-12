import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '../supabase/server.ts';
import { homeFor, pathAllowedFor } from './routing.ts';
import type { Role } from './routing.ts';

/**
 * The data access layer for "who is this" (Next.js authentication guide).
 * Every page and action that needs a user asks here. Identity comes from
 * getClaims (a verified token, not the raw cookie); the profile is read
 * under row level security, so a user can only ever load their own.
 *
 * Server-only: imported from Server Components and Server Actions.
 */
export interface Viewer {
  readonly id: string;
  readonly role: Role;
  readonly orgId: string | null;
  readonly fullName: string;
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from('profiles').select('role, org_id, full_name').eq('id', id).maybeSingle();
  // A login with no profile can do nothing (0001); treat it as signed out.
  if (!profile) return null;
  return { id, role: profile.role as Role, orgId: profile.org_id, fullName: profile.full_name };
});

/** The viewer, or off to sign in. If they are in another role's area, off to their own. */
export async function requireViewerAt(pathname: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(pathname === '/' ? '/login' : `/login?next=${encodeURIComponent(pathname)}`);
  if (!pathAllowedFor(pathname, viewer.role)) redirect(homeFor(viewer.role));
  return viewer;
}
