import type { SupabaseClient } from '@supabase/supabase-js';
import type { Role } from '../../lib/auth/routing.ts';
import { ExistingAccount, insertAccount, isMinor } from './users.ts';

/**
 * Staff create logins in the app (migration 0003).
 *
 * AUTHORIZATION FIRST, AS THE CALLER: `caller` is the signed-in user's own
 * client. can_create_person() runs under their identity in the database, and
 * only its "yes" licenses the service-role writes after it. The service role
 * would enforce nothing by itself.
 *
 * AN EXISTING EMAIL IS NEVER TOUCHED — no password write, no profile write.
 * It is reported, and that is all (Question_Bank, 2026-10-06: a staff
 * "create" that wrote to an existing account let any teacher take over any
 * student).
 *
 * Not "server-only": the database tests import it. Called only from a Server
 * Action, which holds the service key.
 */

export const MAX_PEOPLE_PER_REQUEST = 100;

export interface PersonLine {
  readonly fullName: string;
  readonly email: string;
  readonly dob: string | null;
}

export interface CreatePeopleInput {
  readonly org: string | null;
  readonly role: Role;
  readonly people: readonly PersonLine[];
  /** The caller confirms they hold guardian consent for the under-18s in this list. */
  readonly guardianConsent: boolean;
}

export interface CreatedPerson {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  /** Shown once to the caller, never stored. */
  readonly password: string;
  readonly minorWithoutConsent: boolean;
}

export type CreatePeopleResult =
  | {
      readonly kind: 'ok';
      readonly created: readonly CreatedPerson[];
      readonly existing: readonly string[];
      readonly failed: readonly { readonly email: string; readonly reason: string }[];
    }
  | { readonly kind: 'forbidden' }
  | { readonly kind: 'invalid'; readonly error: string };

export async function createPeople(caller: SupabaseClient, service: SupabaseClient, input: CreatePeopleInput): Promise<CreatePeopleResult> {
  if (input.people.length === 0) return { kind: 'invalid', error: 'Add at least one person.' };
  if (input.people.length > MAX_PEOPLE_PER_REQUEST) return { kind: 'invalid', error: `At most ${MAX_PEOPLE_PER_REQUEST} people at a time.` };

  const { data: me } = await caller.auth.getUser();
  if (!me.user) return { kind: 'forbidden' };
  const { data: allowed, error } = await caller.rpc('can_create_person', { p_role: input.role, p_org: input.org });
  if (error || allowed !== true) return { kind: 'forbidden' };

  const now = new Date().toISOString();
  const created: CreatedPerson[] = [];
  const existing: string[] = [];
  const failed: { email: string; reason: string }[] = [];

  for (const person of input.people) {
    const minor = person.dob !== null && isMinor(person.dob);
    const consent = minor && input.guardianConsent;
    try {
      const account = await insertAccount(service, {
        email: person.email,
        fullName: person.fullName,
        role: input.role,
        dob: person.dob,
        orgId: input.org,
        guardianConsentAt: consent ? now : null,
        createdBy: me.user.id,
        consentRecordedBy: consent ? me.user.id : null,
      });
      created.push({ id: account.id, fullName: person.fullName, email: person.email, password: account.password, minorWithoutConsent: minor && !consent });
    } catch (e) {
      if (e instanceof ExistingAccount) existing.push(person.email);
      else {
        // A system-boundary failure for this one person; logged, reported, and the rest carry on.
        console.error('createPeople: account not created', { reason: (e as Error).message });
        failed.push({ email: person.email, reason: 'Could not be created. Try again.' });
      }
    }
  }
  return { kind: 'ok', created, existing, failed };
}
