import type { Role } from '../../lib/auth/routing.ts';

/**
 * The "Add people" box. One person per line — `Name, email, date of birth` —
 * comma- or tab-separated, so a column pasted out of a spreadsheet just works.
 * Dates as YYYY-MM-DD or the Indian DD/MM/YYYY (or DD-MM-YYYY). Pure: the
 * server re-checks everything (createPeople); this is for showing problems
 * line by line before anything is sent.
 */

export const MAX_LINES = 100;

export interface ParsedPerson {
  readonly fullName: string;
  readonly email: string;
  readonly dob: string | null;
}

export interface ParsedLines {
  readonly people: readonly ParsedPerson[];
  readonly errors: readonly { readonly line: number; readonly message: string }[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HEADER = /^\s*name\s*[,\t]/i;

function toIsoDate(raw: string): string | null {
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

export function parsePeopleLines(text: string, role: Role): ParsedLines {
  const lines = text.split(/\r?\n/);
  const filled = lines.filter((l) => l.trim() !== '');
  if (filled.length > MAX_LINES + 1) return { people: [], errors: [{ line: 0, message: `Add at most ${MAX_LINES} people at a time.` }] };

  const people: ParsedPerson[] = [];
  const errors: { line: number; message: string }[] = [];
  const seen = new Map<string, number>();
  const needsDob = role === 'candidate';

  lines.forEach((raw, i) => {
    const line = i + 1;
    if (raw.trim() === '' || (i === lines.findIndex((l) => l.trim() !== '') && HEADER.test(raw))) return;
    const [name = '', emailRaw = '', dobRaw = ''] = raw.split(/\t|,/).map((f) => f.trim());
    const email = emailRaw.toLowerCase();

    if (name.length < 1 || name.length > 120) return void errors.push({ line, message: 'Needs a name.' });
    if (!EMAIL.test(email) || email.length > 254) return void errors.push({ line, message: 'Needs a valid email.' });
    let dob: string | null = null;
    if (dobRaw !== '') {
      dob = toIsoDate(dobRaw);
      if (!dob) return void errors.push({ line, message: 'The date of birth is not a real past date.' });
    } else if (needsDob) {
      return void errors.push({ line, message: 'A candidate needs a date of birth.' });
    }
    const first = seen.get(email);
    if (first !== undefined) return void errors.push({ line, message: `${email} is already on line ${first}.` });
    seen.set(email, line);
    people.push({ fullName: name, email, dob });
  });

  if (people.length > MAX_LINES) return { people: [], errors: [{ line: 0, message: `Add at most ${MAX_LINES} people at a time.` }] };
  return { people, errors };
}
