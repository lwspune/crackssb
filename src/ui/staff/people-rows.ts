import { passwordProblem } from '../../lib/auth/password.ts';
import { parsePhone } from '../../lib/phone.ts';

/**
 * Every person added — typed into the one-person form or read from an
 * uploaded sheet — passes this one check (D31): in the browser to show
 * problems row by row before anything is sent, and on the server again,
 * which trusts nothing the browser sent. Pure.
 */

export const MAX_PEOPLE = 100;

/** A person as typed: every field a string, blank when left empty. */
export interface RawPerson {
  readonly fullName: string;
  readonly email: string;
  readonly dob: string;
  readonly phone: string;
  readonly password: string;
}

export interface CheckedPerson {
  readonly fullName: string;
  readonly email: string;
  readonly dob: string | null;
  readonly phone: string | null;
  /** null: one is generated. */
  readonly password: string | null;
}

export interface RowProblem {
  /** Index into the rows given; -1 for the list as a whole. */
  readonly index: number;
  readonly message: string;
}

export interface CheckedPeople {
  readonly people: readonly CheckedPerson[];
  readonly errors: readonly RowProblem[];
  /** Groups of row indexes typed with the same password: allowed, but each could sign in as the others. */
  readonly sharedPasswords: readonly (readonly number[])[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** A real past date of birth, as YYYY-MM-DD or DD/MM/YYYY (or DD-MM-YYYY), to YYYY-MM-DD; else null. */
export function toIsoDate(raw: string): string | null {
  const s = raw.trim();
  let y: string, m: string, d: string;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const indian = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  if (iso) [, y, m, d] = iso;
  else if (indian) [, d, m, y] = indian;
  else return null;
  const out = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const date = new Date(`${out}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== out) return null;
  if (date.getTime() >= Date.now() || out < '1940-01-01') return null;
  return out;
}

function checkOne(raw: RawPerson): CheckedPerson | string {
  const fullName = raw.fullName.trim();
  const email = raw.email.trim().toLowerCase();
  if (fullName.length < 1 || fullName.length > 120) return 'Needs a name.';
  if (!EMAIL.test(email) || email.length > 254) return 'Needs a valid email.';

  let dob: string | null = null;
  if (raw.dob.trim() !== '') {
    dob = toIsoDate(raw.dob);
    if (!dob) return 'The date of birth is not a real past date.';
  }

  const phone = parsePhone(raw.phone);
  if (!phone.ok) {
    // Excel shows a 12-digit number in General format as 9.19123E+11, and saves a .csv as shown: the digits are gone.
    if (/^\d(\.\d+)?E\+\d+$/i.test(raw.phone.trim())) {
      return `Excel turned the mobile number into ${raw.phone.trim()}. Format the column as Text, type it again, and upload the .xlsx.`;
    }
    return 'The mobile number is not a mobile number.';
  }

  const password = raw.password === '' ? null : raw.password;
  if (password !== null) {
    const problem = passwordProblem(password, { email, fullName });
    if (problem) return `Password: ${problem}`;
  }
  return { fullName, email, dob, phone: phone.phone, password };
}

export function checkPeople(rows: readonly RawPerson[]): CheckedPeople {
  if (rows.length > MAX_PEOPLE) return { people: [], errors: [{ index: -1, message: `Add at most ${MAX_PEOPLE} people at a time.` }], sharedPasswords: [] };

  const people: CheckedPerson[] = [];
  const errors: RowProblem[] = [];
  const seen = new Set<string>();
  const byPassword = new Map<string, number[]>();

  rows.forEach((raw, index) => {
    const r = checkOne(raw);
    if (typeof r === 'string') return void errors.push({ index, message: r });
    if (seen.has(r.email)) return void errors.push({ index, message: `${r.email} is also on an earlier row.` });
    seen.add(r.email);
    people.push(r);
    if (r.password !== null) byPassword.set(r.password, [...(byPassword.get(r.password) ?? []), index]);
  });

  return { people, errors, sharedPasswords: [...byPassword.values()].filter((g) => g.length > 1) };
}
