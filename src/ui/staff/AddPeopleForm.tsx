'use client';

import { useActionState, useState } from 'react';
import { isMinor } from '../../lib/age.ts';
import type { Role } from '../../lib/auth/routing.ts';
import { parsePeopleLines } from './people-lines.ts';

/**
 * Add people (staff and superadmin). Paste a list, see problems line by line,
 * create the logins, and get each password exactly once to hand out. The
 * server decides what is allowed (can_create_person) and re-checks every line.
 */

export interface CreatedLogin {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly minorWithoutConsent: boolean;
}

export type AddPeopleState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'done'; readonly created: readonly CreatedLogin[]; readonly existing: readonly string[]; readonly failed: readonly { readonly email: string; readonly reason: string }[] };

const ROLE_LABEL: Readonly<Record<Role, string>> = {
  candidate: 'Candidates',
  mentor: 'Mentors',
  org_admin: 'Academy owners',
  superadmin: 'Superadmins',
};

interface Props {
  action: (state: AddPeopleState, form: FormData) => Promise<AddPeopleState>;
  /** What this user may add, first is the default. */
  roles: readonly Role[];
}

export function AddPeopleForm({ action, roles }: Props) {
  const [state, submit, pending] = useActionState(action, { kind: 'idle' });
  const [role, setRole] = useState<Role>(roles[0]);
  const [text, setText] = useState('');

  if (state.kind === 'done') return <Results state={state} />;

  const parsed = parsePeopleLines(text, role);
  const minors = parsed.people.filter((p) => p.dob && isMinor(p.dob)).length;
  const n = parsed.people.length;

  return (
    <form action={submit} className="space-y-6">
      {roles.length > 1 && (
        <div>
          <label htmlFor="role" className="block text-sm font-semibold">Role</label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1.5 block min-h-12 w-full max-w-xs rounded-lg border bg-card px-3 text-base shadow-card"
          >
            {roles.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>
      )}
      {roles.length === 1 && <input type="hidden" name="role" value={roles[0]} />}

      <div>
        <label htmlFor="lines" className="block text-sm font-semibold">One person per line</label>
        <p id="lines-help" className="mt-1 text-sm text-muted-foreground">
          Name, email{role === 'candidate' ? ', date of birth' : ''} — commas or pasted from a spreadsheet.
        </p>
        <textarea
          id="lines"
          name="lines"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-describedby="lines-help"
          spellCheck={false}
          placeholder={role === 'candidate' ? 'Arjun Mehta, arjun@example.com, 14/03/2008' : 'Priya Rao, priya@academy.in'}
          className="mt-2 block w-full rounded-lg border bg-card px-3.5 py-3 font-mono text-sm leading-relaxed shadow-card"
        />
        {parsed.errors.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm text-destructive">
            {parsed.errors.map((e) => (
              <li key={`${e.line}-${e.message}`}>{e.line > 0 ? `Line ${e.line}: ` : ''}{e.message}</li>
            ))}
          </ul>
        )}
      </div>

      {minors > 0 && (
        <label className="flex items-start gap-3 rounded-lg border bg-accent/50 p-4 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
          <input type="checkbox" name="guardianConsent" className="mt-0.5 size-5 shrink-0 accent-[hsl(var(--brand))]" />
          <span>
            <span className="block font-semibold">I hold guardian consent for the {minors} under-18{minors === 1 ? '' : 's'} listed</span>
            <span className="block text-muted-foreground">Without it they can sign in but cannot start a test.</span>
          </span>
        </label>
      )}

      {state.kind === 'error' && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">{state.message}</p>
      )}

      <button
        type="submit"
        disabled={pending || n === 0 || parsed.errors.length > 0}
        className="inline-flex min-h-12 items-center rounded-lg bg-brand px-6 text-base font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50"
      >
        {pending ? 'Creating…' : `Create ${n} login${n === 1 ? '' : 's'}`}
      </button>
    </form>
  );
}

function Results({ state }: { state: Extract<AddPeopleState, { kind: 'done' }> }) {
  const [copied, setCopied] = useState(false);
  const sheet = state.created.map((c) => `${c.fullName}\t${c.email}\t${c.password}`).join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sheet);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      {state.created.length > 0 && (
        <section aria-labelledby="created-h" className="rounded-xl border bg-card p-5 shadow-card">
          <h2 id="created-h" className="text-lg font-bold">{state.created.length} login{state.created.length === 1 ? '' : 's'} created</h2>
          <p className="mt-1 text-sm font-medium text-destructive">Passwords are shown once. Copy or print them now.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr><th className="py-2 pr-4 font-semibold">Name</th><th className="py-2 pr-4 font-semibold">Email</th><th className="py-2 font-semibold">Password</th></tr>
              </thead>
              <tbody className="divide-y">
                {state.created.map((c) => (
                  <tr key={c.email}>
                    <td className="py-2.5 pr-4 font-medium">{c.fullName}{c.minorWithoutConsent && <span className="ml-2 text-xs text-muted-foreground">needs guardian consent</span>}</td>
                    <td className="py-2.5 pr-4">{c.email}</td>
                    <td className="py-2.5 font-mono tracking-wide">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div data-print-hide className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={copy} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90">
              {copied ? 'Copied' : 'Copy all'}
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center rounded-lg border px-5 text-sm font-semibold hover:bg-secondary">
              Print
            </button>
          </div>
        </section>
      )}

      {state.existing.length > 0 && (
        <section aria-labelledby="existing-h" className="rounded-xl border border-dashed p-5">
          <h2 id="existing-h" className="font-semibold">Already have an account — not changed</h2>
          <ul className="mt-2 text-sm text-muted-foreground">{state.existing.map((e) => <li key={e}>{e}</li>)}</ul>
        </section>
      )}

      {state.failed.length > 0 && (
        <section aria-labelledby="failed-h" role="alert" className="rounded-xl border border-destructive/40 p-5">
          <h2 id="failed-h" className="font-semibold text-destructive">Not created</h2>
          <ul className="mt-2 text-sm">{state.failed.map((f) => <li key={f.email}>{f.email} — {f.reason}</li>)}</ul>
        </section>
      )}

      <a data-print-hide href="" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">Add more people</a>
    </div>
  );
}
