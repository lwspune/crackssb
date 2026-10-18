'use client';

import { Fragment, useActionState, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { isMinor } from '../../lib/age.ts';
import type { Role } from '../../lib/auth/routing.ts';
import { LoginHandout } from './LoginHandout.tsx';
import { loginMessage, whatsappHref } from './login-message.ts';
import { INPUT, PasswordField } from './PasswordField.tsx';
import { checkPeople, toIsoDate } from './people-rows.ts';
import type { RawPerson } from './people-rows.ts';
import { loginsWorkbook, peopleTemplate, readPeopleFile } from './people-sheet.ts';
import type { SheetRows } from './people-sheet.ts';

/**
 * Add people (D31): one person by fields, or many from an Excel or CSV file
 * against a template. Every row is checked here for the preview and again on
 * the server, which also decides what this user may add (can_create_person).
 * Each new login comes back once, with its WhatsApp message.
 */

export interface CreatedLogin {
  readonly fullName: string;
  readonly email: string;
  readonly password: string;
  readonly phone: string | null;
  readonly minorWithoutConsent: boolean;
}

export type AddPeopleState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'done'; readonly created: readonly CreatedLogin[]; readonly existing: readonly string[]; readonly failed: readonly { readonly email: string; readonly reason: string }[] };

type Submit = (form: FormData) => void;

const ROLE_LABEL: Readonly<Record<Role, string>> = {
  candidate: 'Candidates',
  mentor: 'Mentors',
  org_admin: 'Academy owners',
  superadmin: 'Superadmins',
};

const BUTTON =
  'inline-flex min-h-12 items-center rounded-lg bg-brand px-6 text-base font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
const QUIET =
  'inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

const TABS = [
  { key: 'one', label: 'One person' },
  { key: 'many', label: 'Many (Excel)' },
] as const;
type Tab = (typeof TABS)[number]['key'];

function download(bytes: Uint8Array<ArrayBuffer>, name: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Props {
  action: (state: AddPeopleState, form: FormData) => Promise<AddPeopleState>;
  /** What this user may add, first is the default. */
  roles: readonly Role[];
}

export function AddPeopleForm({ action, roles }: Props) {
  const [state, submit, pending] = useActionState(action, { kind: 'idle' });
  const [role, setRole] = useState<Role>(roles[0]);
  const [tab, setTab] = useState<Tab>('one');
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ one: null, many: null });

  if (state.kind === 'done') return <Results state={state} single={tab === 'one'} />;

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next: Tab = tab === 'one' ? 'many' : 'one';
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="space-y-6">
      {roles.length > 1 && (
        <div>
          <label htmlFor="role" className="block text-sm font-semibold">Role</label>
          <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className={`mt-1.5 max-w-xs ${INPUT}`}>
            {roles.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
        </div>
      )}

      <div role="tablist" aria-label="How to add" className="inline-flex rounded-lg border bg-secondary p-1" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t.key}
            ref={(el) => {
              tabRefs.current[t.key] = el;
            }}
            id={`tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => setTab(t.key)}
            className={`min-h-11 rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-ring ${tab === t.key ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'one' ? <OnePerson key={role} role={role} submit={submit} pending={pending} /> : <Many key={role} role={role} submit={submit} pending={pending} />}
      </div>

      {state.kind === 'error' && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">{state.message}</p>
      )}
    </div>
  );
}

function Consent({ count }: { count: number }) {
  return (
    <label className="flex items-start gap-3 rounded-lg border bg-accent/50 p-4 text-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring">
      <input type="checkbox" name="guardianConsent" className="mt-0.5 size-5 shrink-0 accent-[hsl(var(--brand))]" />
      <span>
        <span className="block font-semibold">
          {count === 1 ? 'I hold guardian consent for this under-18' : `I hold guardian consent for the ${count} under-18s listed`}
        </span>
        <span className="block text-muted-foreground">Without it they can sign in but cannot start a test.</span>
      </span>
    </label>
  );
}

function OnePerson({ role, submit, pending }: { role: Role; submit: Submit; pending: boolean }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const raw: RawPerson = { fullName, email, dob, phone, password };
  const checked = checkPeople([raw], role);
  const problem = checked.errors[0]?.message;
  // The password field shows its own problem; the rest show once name and email are in.
  const shown = problem && fullName.trim() !== '' && email.trim() !== '' && !problem.startsWith('Password:') ? problem : null;
  const iso = role === 'candidate' ? toIsoDate(dob) : null;
  const minor = iso !== null && isMinor(iso);

  return (
    <form action={submit} className="max-w-xl space-y-4">
      <input type="hidden" name="mode" value="one" />
      <input type="hidden" name="role" value={role} />
      <div>
        <label htmlFor="add-name" className="block text-sm font-semibold">Name</label>
        <input id="add-name" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={120} autoComplete="off" className={`mt-1.5 ${INPUT}`} />
      </div>
      <div>
        <label htmlFor="add-email" className="block text-sm font-semibold">Email</label>
        <input id="add-email" name="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" spellCheck={false} className={`mt-1.5 ${INPUT}`} />
      </div>
      {role === 'candidate' && (
        <div>
          <label htmlFor="add-dob" className="block text-sm font-semibold">Date of birth</label>
          <input id="add-dob" name="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={`mt-1.5 ${INPUT}`} />
        </div>
      )}
      <div>
        <label htmlFor="add-phone" className="block text-sm font-semibold">Mobile <span className="font-normal text-muted-foreground">(optional, for WhatsApp)</span></label>
        <input id="add-phone" name="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" autoComplete="off" className={`mt-1.5 ${INPUT}`} />
      </div>
      <PasswordField id="add-password" name="password" label="Password" who={{ email, fullName }} onValue={setPassword} />
      <p className="-mt-2 text-sm text-muted-foreground">Leave it blank and one is made for them.</p>
      {minor && <Consent count={1} />}
      {shown && <p className="text-sm text-destructive">{shown}</p>}
      <button type="submit" disabled={pending || checked.people.length !== 1} className={BUTTON}>
        {pending ? 'Creating…' : 'Create login'}
      </button>
    </form>
  );
}

const and = (xs: readonly number[]) => (xs.length < 2 ? String(xs[0]) : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function Many({ role, submit, pending }: { role: Role; submit: Submit; pending: boolean }) {
  const [sheet, setSheet] = useState<SheetRows | null>(null);
  const [fileName, setFileName] = useState('');

  const onFile = async (file: File | undefined) => {
    setSheet(null);
    if (!file) return;
    setFileName(file.name);
    if (file.size > 5 * 1024 * 1024) return setSheet({ rows: [], error: 'This file is too large. Up to 100 people fit in well under 1 MB.' });
    setSheet(await readPeopleFile(file.name, new Uint8Array(await file.arrayBuffer())));
  };

  const rows = sheet?.rows ?? [];
  const checked = checkPeople(rows.map((r) => r.person), role);
  const problems = new Map(checked.errors.filter((e) => e.index >= 0).map((e) => [e.index, e.message]));
  const listProblem = checked.errors.find((e) => e.index < 0)?.message;
  const minors = role === 'candidate' ? checked.people.filter((p) => p.dob && isMinor(p.dob)).length : 0;
  const n = checked.people.length;

  return (
    <form action={submit} className="space-y-5">
      <input type="hidden" name="mode" value="many" />
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="rows" value={JSON.stringify(rows.map((r) => r.person))} />

      <ol className="space-y-4">
        <li className="flex flex-wrap items-center gap-3">
          <span className="text-sm"><span className="font-semibold">1.</span> Fill the template: one person per row.</span>
          <button type="button" onClick={() => download(peopleTemplate(), 'cadetprep-people.xlsx')} className={QUIET}>
            Download template
          </button>
        </li>
        <li>
          <label htmlFor="add-file" className="block text-sm"><span className="font-semibold">2.</span> Upload it (.xlsx or .csv, up to 100 people)</label>
          <input
            id="add-file"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            onChange={(e) => void onFile(e.target.files?.[0])}
            className="mt-2 block w-full max-w-md text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border file:bg-card file:px-4 file:font-semibold hover:file:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
          />
        </li>
      </ol>

      {sheet?.error && <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">{sheet.error}</p>}
      {listProblem && <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">{listProblem}</p>}
      {sheet && !sheet.error && rows.length === 0 && <p role="alert" className="text-sm text-destructive">{fileName} has no one in it yet. Fill rows from row 2.</p>}

      {rows.length > 0 && !listProblem && (
        <>
          <p className="text-sm font-semibold">
            {n} ready{checked.errors.length > 0 ? ` · ${checked.errors.length} to fix` : ''}
            {checked.errors.length > 0 && <span className="font-normal text-muted-foreground"> — fix them in the file and upload it again.</span>}
          </p>
          <div className="overflow-x-auto rounded-xl border bg-card shadow-card">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">People in {fileName}</caption>
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-semibold">Row</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Name</th>
                  <th scope="col" className="px-3 py-2 font-semibold">Email</th>
                  <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">Date of birth</th>
                  <th scope="col" className="hidden px-3 py-2 font-semibold md:table-cell">Mobile</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const problem = problems.get(i);
                  // The problem on its own full-width line under the row, so it reads at any width.
                  return (
                    <Fragment key={r.sheetRow}>
                      <tr className={`border-t ${problem ? 'bg-destructive/5' : ''}`}>
                        <td className="px-3 py-2.5 tabular-nums text-muted-foreground">{r.sheetRow}</td>
                        <td className="px-3 py-2.5 font-medium">{r.person.fullName}</td>
                        <td className="max-w-48 truncate px-3 py-2.5">{r.person.email}</td>
                        <td className="hidden px-3 py-2.5 sm:table-cell">{r.person.dob}</td>
                        <td className="hidden px-3 py-2.5 md:table-cell">{r.person.phone}</td>
                      </tr>
                      {problem && (
                        <tr className="bg-destructive/5">
                          <td colSpan={5} className="px-3 pb-2.5 pt-0 text-sm font-medium text-destructive">Row {r.sheetRow}: {problem}</td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {checked.sharedPasswords.map((g) => {
            const sheetRows = g.map((i) => rows[i].sheetRow);
            return (
              <p key={sheetRows.join()} className="rounded-lg border bg-accent/50 px-3.5 py-2.5 text-sm">
                Rows {and(sheetRows)} share a password: each could sign in as {sheetRows.length === 2 ? 'the other' : 'the others'}.
              </p>
            );
          })}
          {minors > 0 && <Consent count={minors} />}
          <button type="submit" disabled={pending || n === 0 || checked.errors.length > 0} className={BUTTON}>
            {pending ? 'Creating…' : `Create ${n} login${n === 1 ? '' : 's'}`}
          </button>
        </>
      )}
    </form>
  );
}

function CopyMessage({ login }: { login: CreatedLogin }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(loginMessage({ ...login, needsConsent: login.minorWithoutConsent }));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" onClick={copy} aria-label={`Copy message for ${login.fullName}`} className={QUIET}>
      {copied ? 'Copied' : 'Copy message'}
    </button>
  );
}

function Results({ state, single }: { state: Extract<AddPeopleState, { kind: 'done' }>; single: boolean }) {
  const [copied, setCopied] = useState(false);
  const logins = state.created.map((c) => ({ ...c, needsConsent: c.minorWithoutConsent }));

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(state.created.map((c) => `${c.fullName}\t${c.email}\t${c.password}`).join('\n'));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-6">
      {single && logins.length === 1 && (
        <section aria-labelledby="created-h" className="max-w-xl space-y-4">
          <h2 id="created-h" className="text-lg font-bold">Login created for {logins[0].fullName}</h2>
          <LoginHandout login={logins[0]} phone={logins[0].phone} />
        </section>
      )}

      {!(single && logins.length === 1) && logins.length > 0 && (
        <section aria-labelledby="created-h" className="rounded-xl border bg-card p-5 shadow-card">
          <h2 id="created-h" className="text-lg font-bold">{logins.length} login{logins.length === 1 ? '' : 's'} created</h2>
          <p className="mt-1 text-sm font-medium text-destructive">Passwords are shown once. Send or download them now.</p>
          <ul className="mt-4 divide-y">
            {logins.map((l) => (
              <li key={l.email} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {l.fullName}
                    {l.needsConsent && <span className="ml-2 text-xs font-normal text-muted-foreground">needs guardian consent</span>}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">{l.email}</span>
                  <span className="block font-mono text-sm tracking-wide">{l.password}</span>
                </span>
                <span data-print-hide className="flex flex-wrap gap-2">
                  <CopyMessage login={l} />
                  <a
                    href={whatsappHref(loginMessage(l), l.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`WhatsApp ${l.fullName}`}
                    className={QUIET}
                  >
                    WhatsApp
                  </a>
                </span>
              </li>
            ))}
          </ul>
          <div data-print-hide className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => download(loginsWorkbook(logins), 'cadetprep-logins.xlsx')} className={BUTTON}>
              Download logins (.xlsx)
            </button>
            <button type="button" onClick={copyAll} className={QUIET}>{copied ? 'Copied' : 'Copy all'}</button>
            <button type="button" onClick={() => window.print()} className={QUIET}>Print</button>
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

      <a data-print-hide href="" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">
        {single ? 'Add another' : 'Add more people'}
      </a>
    </div>
  );
}
