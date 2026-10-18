/**
 * The PPDT character box (D33), as the sheet prints it: how many people, then
 * each one's sex, age and mood (+, 0, −), then the action in a line. Saved as
 * one text answer ('0:note', 0012). Read back tolerantly: anything that does
 * not fit a field is dropped, never thrown — the feedback must not fail on
 * what a candidate typed. Pure.
 */

export type Sex = 'M' | 'F' | '';
export type MoodMark = '+' | '0' | '-' | '';

export interface NotedPerson {
  readonly sex: Sex;
  /** Years, as typed: '' or 1–99. */
  readonly age: string;
  readonly mood: MoodMark;
}

export interface PpdtNote {
  readonly count: number | null;
  readonly people: readonly NotedPerson[];
  readonly action: string;
}

/** The sheet has room for eight; a crowd is counted, not described one by one. */
export const MAX_ROWS = 8;
export const EMPTY_NOTE: PpdtNote = { count: null, people: [], action: '' };
const BLANK: NotedPerson = { sex: '', age: '', mood: '' };

export function serialiseNote(note: PpdtNote): string {
  return JSON.stringify(note);
}

const person = (raw: unknown): NotedPerson => {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const age = typeof r.age === 'string' && /^\d{1,2}$/.test(r.age) && Number(r.age) > 0 ? r.age : '';
  return {
    sex: r.sex === 'M' || r.sex === 'F' ? r.sex : '',
    age,
    mood: r.mood === '+' || r.mood === '0' || r.mood === '-' ? r.mood : '',
  };
};

export function parseNote(text: string): PpdtNote {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return EMPTY_NOTE;
  }
  if (typeof raw !== 'object' || raw === null) return EMPTY_NOTE;
  const r = raw as Record<string, unknown>;
  const count = typeof r.count === 'number' && Number.isInteger(r.count) && r.count >= 0 && r.count < 100 ? r.count : null;
  const people = Array.isArray(r.people) ? r.people.slice(0, MAX_ROWS).map(person) : [];
  const action = typeof r.action === 'string' ? r.action.slice(0, 300) : '';
  return { count, people, action };
}

/** The box with `count` people: rows already filled are kept, new ones blank, never more than the sheet holds. */
export function withCount(note: PpdtNote, count: number | null): PpdtNote {
  if (count === null) return { ...note, count: null, people: [] };
  const rows = Math.min(count, MAX_ROWS);
  return { ...note, count, people: Array.from({ length: rows }, (_, i) => note.people[i] ?? BLANK) };
}
