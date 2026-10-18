/**
 * A mobile number, as staff type it, stored the one way the database accepts:
 * `+` then digits (0008), which is also what a WhatsApp link needs. Indian
 * numbers need no code; another country's needs its `+` code. Pure.
 */

export type ParsedPhone = { readonly ok: true; readonly phone: string | null } | { readonly ok: false };

const INDIAN = /^[6-9]\d{9}$/;

export function parsePhone(raw: string): ParsedPhone {
  const s = raw.replace(/[\s().-]/g, '');
  if (s === '') return { ok: true, phone: null };
  if (s.startsWith('+91')) return INDIAN.test(s.slice(3)) ? { ok: true, phone: s } : { ok: false };
  if (s.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(s) ? { ok: true, phone: s } : { ok: false };
  if (INDIAN.test(s)) return { ok: true, phone: `+91${s}` };
  if (s.length === 11 && s.startsWith('0') && INDIAN.test(s.slice(1))) return { ok: true, phone: `+91${s.slice(1)}` };
  if (s.length === 12 && s.startsWith('91') && INDIAN.test(s.slice(2))) return { ok: true, phone: `+${s}` };
  return { ok: false };
}

/** `+91 98765 43210`; any other country's number as stored. */
export function formatPhone(phone: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(phone);
  return m ? `+91 ${m[1]} ${m[2]}` : phone;
}
