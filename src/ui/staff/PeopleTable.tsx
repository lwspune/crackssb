import Link from 'next/link';
import { isMinor } from '../../lib/age.ts';
import type { Role } from '../../lib/auth/routing.ts';
import { ArrowIcon } from '../icons.tsx';

export interface PersonRow {
  readonly id: string;
  readonly full_name: string;
  readonly email: string;
  readonly role: Role;
  readonly dob: string | null;
  readonly guardian_consent_at: string | null;
  readonly deactivated_at: string | null;
  readonly created_at: string;
}

/** The columns the list reads; both pages that render it select exactly these. */
export const PERSON_COLUMNS = 'id, full_name, email, role, dob, guardian_consent_at, deactivated_at, created_at';

export const ROLE_LABEL: Readonly<Record<Role, string>> = { candidate: 'Candidate', mentor: 'Mentor', org_admin: 'Academy owner', superadmin: 'Superadmin' };

/** An academy's people, each opening their own page (D31). Read under row level security by the page that renders it. */
export function PeopleTable({ people }: { people: readonly PersonRow[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {people.map((p) => {
        const needsConsent = p.role === 'candidate' && p.dob !== null && isMinor(p.dob) && p.guardian_consent_at === null;
        return (
          <li key={p.id}>
            <Link
              href={`/staff/people/${p.id}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="min-w-0">
                <span className={`block truncate font-semibold ${p.deactivated_at ? 'text-muted-foreground line-through' : ''}`}>{p.full_name}</span>
                <span className="block truncate text-sm text-muted-foreground">{p.email}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {p.deactivated_at && <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">Switched off</span>}
                {needsConsent && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">Needs guardian consent</span>}
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{ROLE_LABEL[p.role]}</span>
                <ArrowIcon aria-hidden="true" width={16} height={16} className="text-muted-foreground" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
