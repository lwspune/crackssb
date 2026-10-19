import { formatPhone } from '../../lib/phone.ts';
import { parseCsv } from '../../lib/sheet/csv.ts';
import { readXlsx, writeXlsx } from '../../lib/sheet/xlsx.ts';
import type { Cell } from '../../lib/sheet/xlsx.ts';
import { BRAND } from '../brand.ts';
import { loginMessage } from './login-message.ts';
import type { LoginToSend } from './login-message.ts';
import type { RawPerson } from './people-rows.ts';

/**
 * Bulk upload (D31 §8): the template staff download, reading an uploaded
 * .xlsx or .csv into rows for checkPeople, and the list of new logins to
 * keep. Columns are found by their header, so a sheet an academy already
 * keeps works as long as it has a Name and an Email column.
 */

export const TEMPLATE_HEADERS = ['Name', 'Email', 'Date of birth (DD/MM/YYYY)', 'Mobile', 'Password'] as const;

type Field = keyof RawPerson;

/** Header names, squashed (lower case, letters only, anything in brackets dropped), by field. */
const ALIASES: Readonly<Record<Field, readonly string[]>> = {
  fullName: ['name', 'fullname', 'candidatename', 'studentname', 'cadetname'],
  email: ['email', 'emailid', 'emailaddress', 'mail', 'mailid'],
  dob: ['dateofbirth', 'dob', 'birthdate', 'birthday'],
  phone: ['mobile', 'mobileno', 'mobilenumber', 'phone', 'phoneno', 'phonenumber', 'whatsapp', 'whatsappnumber', 'contact', 'contactnumber'],
  password: ['password'],
};

const squash = (h: string) => h.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z]/g, '');

/** An Excel date serial (days since 1899-12-30) as YYYY-MM-DD. */
function serialToIso(n: number): string {
  return new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000).toISOString().slice(0, 10);
}

const blank = (c: Cell | undefined) => c === null || c === undefined || (typeof c === 'string' && c.trim() === '');

export interface SheetRows {
  /** Each non-blank row, with its own row number in the sheet (for messages). */
  readonly rows: readonly { readonly sheetRow: number; readonly person: RawPerson }[];
  readonly error: string | null;
}

export function readPeopleSheet(cells: readonly (readonly Cell[])[]): SheetRows {
  const headerAt = cells.findIndex((r) => r.some((c) => !blank(c)));
  if (headerAt < 0) return { rows: [], error: 'The file is empty.' };

  const where = new Map<Field, number>();
  cells[headerAt].forEach((h, i) => {
    if (typeof h !== 'string') return;
    const key = squash(h);
    for (const [field, names] of Object.entries(ALIASES) as [Field, readonly string[]][]) {
      if (names.includes(key) && !where.has(field)) where.set(field, i);
    }
  });
  if (!where.has('fullName') || !where.has('email')) {
    return { rows: [], error: 'The first row needs a Name and an Email column. Download the template to see the layout.' };
  }

  const text = (row: readonly Cell[], field: Field): string => {
    const i = where.get(field);
    const c = i === undefined ? null : row[i];
    if (c === null || c === undefined) return '';
    if (typeof c === 'number') return field === 'dob' && c > 1 && c < 2958466 ? serialToIso(c) : String(c);
    return field === 'password' ? c : c.trim();
  };

  const rows = cells
    .map((row, i) => ({ row, sheetRow: i + 1 }))
    .slice(headerAt + 1)
    .filter(({ row }) => row.some((c) => !blank(c)))
    .map(({ row, sheetRow }) => ({
      sheetRow,
      person: { fullName: text(row, 'fullName'), email: text(row, 'email'), dob: text(row, 'dob'), phone: text(row, 'phone'), password: text(row, 'password') },
    }));
  return { rows, error: null };
}

/** Read an uploaded file by its kind. Never throws: a file it cannot read comes back as an error to show. */
export async function readPeopleFile(name: string, bytes: Uint8Array): Promise<SheetRows> {
  const lower = name.toLowerCase();
  try {
    if (lower.endsWith('.xlsx')) return readPeopleSheet(await readXlsx(bytes));
    if (lower.endsWith('.csv')) return readPeopleSheet(parseCsv(new TextDecoder().decode(bytes)));
  } catch (e) {
    return { rows: [], error: e instanceof Error && /xlsx|large|sheet/.test(e.message) ? e.message : 'This file could not be read.' };
  }
  return { rows: [], error: 'Upload an .xlsx or .csv file.' };
}

/** The template: the columns to fill on the first sheet, and how to fill them on the second. */
export function peopleTemplate(): Uint8Array<ArrayBuffer> {
  return writeXlsx([
    { name: 'People', rows: [[...TEMPLATE_HEADERS]], textColumns: true, freezeHeader: true, widths: [26, 32, 26, 18, 18] },
    {
      name: 'How to fill',
      widths: [26, 70],
      rows: [
        ['Column', 'What to put'],
        ['Name', 'Required. As it should appear in the app.'],
        ['Email', 'Required. Their login. Each email once.'],
        ['Date of birth', 'Optional. DD/MM/YYYY, e.g. 14/03/2008. Under 18 needs a guardian’s consent before tests.'],
        ['Mobile', 'Optional. Lets "Send on WhatsApp" open their chat. 10 digits, or +code outside India.'],
        ['Password', 'Optional. At least 8 characters. Leave blank and one is made for them.'],
        ['', ''],
        ['Example', 'Arjun Mehta | arjun@example.com | 14/03/2008 | 98765 43210 | Cadet@2026'],
        ['Limit', 'Up to 100 people per file. Fill the People sheet from row 2; keep row 1 as it is.'],
        ['After upload', `${BRAND.name} shows each new login with a WhatsApp message to send.`],
      ],
    },
  ]);
}

export interface NewLogin extends LoginToSend {
  readonly phone: string | null;
}

/** The new logins, to keep or mail-merge: shown once on screen, so offered as a file too. */
export function loginsWorkbook(logins: readonly NewLogin[]): Uint8Array<ArrayBuffer> {
  return writeXlsx([
    {
      name: 'Logins',
      textColumns: true,
      freezeHeader: true,
      widths: [26, 32, 20, 18, 60],
      rows: [['Name', 'Email', 'Password', 'Mobile', 'Message'], ...logins.map((l) => [l.fullName, l.email, l.password, l.phone ? formatPhone(l.phone) : '', loginMessage(l)])],
    },
  ]);
}
