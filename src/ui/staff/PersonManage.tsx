'use client';

import { useActionState, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role } from '../../lib/auth/routing.ts';
import { formatPhone } from '../../lib/phone.ts';
import { LoginHandout } from './LoginHandout.tsx';
import type { LoginToSend } from './login-message.ts';
import { INPUT, PasswordField } from './PasswordField.tsx';

/**
 * One person, managed (D31). Each control appears only when the database
 * says this viewer may use it (can_manage_person, read by the page), and the
 * database checks again on every action.
 */

export type ManageState = { readonly kind: 'idle' } | { readonly kind: 'error'; readonly message: string } | { readonly kind: 'saved'; readonly message: string };

export type PasswordState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'done'; readonly login: LoginToSend; readonly phone: string | null };

type Act<S> = (state: S, form: FormData) => Promise<S>;

export interface ManageActions {
  readonly details: Act<ManageState>;
  readonly password: Act<PasswordState>;
  readonly consent: Act<ManageState>;
  readonly role: Act<ManageState>;
  readonly active: Act<ManageState>;
  readonly remove: Act<ManageState>;
}

export interface ManagedPerson {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: Role;
  readonly dob: string | null;
  readonly phone: string | null;
  readonly needsConsent: boolean;
  readonly deactivated: boolean;
}

export type Rights = Readonly<Record<'edit' | 'password' | 'deactivate' | 'delete' | 'role', boolean>>;

const BUTTON =
  'inline-flex min-h-12 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const QUIET =
  'inline-flex min-h-12 items-center rounded-lg border px-5 text-sm font-semibold hover:bg-secondary disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function PersonManage({ person, rights, actions }: { person: ManagedPerson; rights: Rights; actions: ManageActions }) {
  // Held from first render: once consent is recorded the page refreshes without the need, and the confirmation should stay.
  const [askConsent] = useState(person.needsConsent);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rights.edit && <Details person={person} action={actions.details} />}
      {rights.password && <Password person={person} action={actions.password} />}
      {rights.edit && askConsent && <Consent action={actions.consent} />}
      {rights.role && (person.role === 'mentor' || person.role === 'org_admin') && <RoleForm role={person.role} action={actions.role} />}
      {(rights.deactivate || rights.delete) && <Access person={person} rights={rights} active={actions.active} remove={actions.remove} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `h-${title.toLowerCase().replace(/\W+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="rounded-xl border bg-card p-5 shadow-card">
      <h2 id={id} className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Status({ state }: { state: ManageState | PasswordState }) {
  if (state.kind === 'error') return <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">{state.message}</p>;
  if (state.kind === 'saved') return <p role="status" className="text-sm font-medium text-brand-accent">{state.message}</p>;
  return null;
}

function Details({ person, action }: { person: ManagedPerson; action: Act<ManageState> }) {
  const [state, submit, pending] = useActionState(action, { kind: 'idle' });
  return (
    <Section title="Details">
      <form action={submit} className="space-y-4">
        <div>
          <label htmlFor="full-name" className="block text-sm font-semibold">Name</label>
          <input id="full-name" name="fullName" defaultValue={person.fullName} maxLength={120} required autoComplete="off" className={`mt-1.5 ${INPUT}`} />
        </div>
        {person.role === 'candidate' && (
          <div>
            <label htmlFor="dob" className="block text-sm font-semibold">Date of birth</label>
            <input id="dob" name="dob" type="date" defaultValue={person.dob ?? ''} required className={`mt-1.5 ${INPUT}`} />
          </div>
        )}
        <div>
          <label htmlFor="phone" className="block text-sm font-semibold">Mobile <span className="font-normal text-muted-foreground">(optional, for WhatsApp)</span></label>
          <input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={person.phone ? formatPhone(person.phone) : ''} placeholder="98765 43210" autoComplete="off" className={`mt-1.5 ${INPUT}`} />
        </div>
        <Status state={state} />
        <button type="submit" disabled={pending} className={BUTTON}>{pending ? 'Saving…' : 'Save details'}</button>
      </form>
    </Section>
  );
}

function Password({ person, action }: { person: ManagedPerson; action: Act<PasswordState> }) {
  const [state, submit, pending] = useActionState(action, { kind: 'idle' });
  return (
    <Section title="Password">
      {state.kind === 'done' ? (
        <LoginHandout login={state.login} phone={state.phone} />
      ) : (
        <form action={submit} className="space-y-4">
          <PasswordField id="new-password" name="password" label="New password" who={{ email: person.email, fullName: person.fullName }} />
          <p className="text-sm text-muted-foreground">Replaces the old one. You get the message to send.</p>
          <Status state={state} />
          <button type="submit" disabled={pending} className={BUTTON}>{pending ? 'Setting…' : 'Set password'}</button>
        </form>
      )}
    </Section>
  );
}

function Consent({ action }: { action: Act<ManageState> }) {
  const [state, submit, pending] = useActionState(action, { kind: 'idle' });
  return (
    <Section title="Guardian consent">
      <form action={submit} className="space-y-4">
        <p className="text-sm text-muted-foreground">Under 18, none on record. Tests stay locked until it is.</p>
        <Status state={state} />
        {state.kind !== 'saved' && <button type="submit" disabled={pending} className={BUTTON}>{pending ? 'Recording…' : 'Record guardian consent'}</button>}
      </form>
    </Section>
  );
}

function RoleForm({ role, action }: { role: 'mentor' | 'org_admin'; action: Act<ManageState> }) {
  const [state, submit, pending] = useActionState(action, { kind: 'idle' });
  return (
    <Section title="Academy role">
      <form action={submit} className="space-y-4">
        <div>
          <label htmlFor="role" className="block text-sm font-semibold">Role</label>
          <select id="role" name="role" defaultValue={role} className={`mt-1.5 max-w-xs ${INPUT}`}>
            <option value="mentor">Mentor</option>
            <option value="org_admin">Academy owner</option>
          </select>
        </div>
        <Status state={state} />
        <button type="submit" disabled={pending} className={BUTTON}>{pending ? 'Saving…' : 'Save role'}</button>
      </form>
    </Section>
  );
}

function Access({ person, rights, active, remove }: { person: ManagedPerson; rights: Rights; active: Act<ManageState>; remove: Act<ManageState> }) {
  const [activeState, submitActive, activePending] = useActionState(active, { kind: 'idle' });
  const [removeState, submitRemove, removePending] = useActionState(remove, { kind: 'idle' });
  const [confirming, setConfirming] = useState(false);

  return (
    <Section title="Access">
      <div className="space-y-5">
        {rights.deactivate && (
          <form action={submitActive} className="space-y-3">
            <input type="hidden" name="active" value={person.deactivated ? 'on' : 'off'} />
            <p className="text-sm text-muted-foreground">
              {person.deactivated ? 'Switched off. Cannot sign in.' : 'Switch off to stop sign-in. Their work is kept.'}
            </p>
            <Status state={activeState} />
            <button type="submit" disabled={activePending} className={person.deactivated ? BUTTON : QUIET}>
              {activePending ? 'Saving…' : person.deactivated ? 'Switch on' : 'Switch off'}
            </button>
          </form>
        )}
        {rights.delete && (
          <form action={submitRemove} className="space-y-3 border-t pt-5">
            <p className="text-sm text-muted-foreground">Never used. Remove it to fix a wrong email.</p>
            <Status state={removeState} />
            {confirming ? (
              <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Confirm removal">
                <p className="w-full text-sm font-semibold text-destructive">Remove {person.email}? This cannot be undone.</p>
                <button type="submit" disabled={removePending} className="inline-flex min-h-12 items-center rounded-lg bg-destructive px-5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  {removePending ? 'Removing…' : 'Yes, remove'}
                </button>
                <button type="button" onClick={() => setConfirming(false)} className={QUIET}>Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={QUIET}>Remove login</button>
            )}
          </form>
        )}
      </div>
    </Section>
  );
}
