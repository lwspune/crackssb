import type { Role } from './routing.ts';

/**
 * Which academy the staff area works in (D25). Pure, so the rule is tested
 * apart from cookies. Staff always work in their own academy — the cookie is
 * read only for the superadmin, and only when it names an academy that exists.
 * Row level security still decides what any of them can read or write.
 */
export const ACTING_ORG_COOKIE = 'acting_org';

export function actingAcademy(
  viewer: { role: Role; orgId: string | null },
  picked: string | null,
  academies: readonly string[],
): string | null {
  if (viewer.role === 'mentor' || viewer.role === 'org_admin') return viewer.orgId;
  if (viewer.role !== 'superadmin') return null;
  return picked && academies.includes(picked) ? picked : null;
}
