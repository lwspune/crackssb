/**
 * The owner's view of candidates with no academy (D42): who joined, how, and
 * what they have taken. Pure; src/lib/admin/candidates.ts loads the rows.
 */

export interface SoloPerson {
  readonly id: string;
  readonly fullName: string;
  readonly email: string | null;
  readonly joinedVia: 'staff' | 'google';
  readonly joinedAt: string;
  readonly deactivated: boolean;
}

/** One attempt, as `sessions` has it: whose, which test, when. */
export interface SessionRow {
  readonly candidateId: string;
  readonly type: string;
  readonly startedAt: string;
}

/** The tests, in SSB order: OIR (mocks), then the psychology tests by day. */
export const TESTS = [
  { test: 'oir', label: 'OIR' },
  { test: 'ppdt', label: 'PPDT' },
  { test: 'tat', label: 'TAT' },
  { test: 'wat', label: 'WAT' },
  { test: 'srt', label: 'SRT' },
  { test: 'sdt', label: 'SDT' },
] as const;

export type TestKind = (typeof TESTS)[number]['test'];

export interface CandidateRow extends SoloPerson {
  readonly attempts: number;
  /** Tests taken, in SSB order; a test not taken is left out. */
  readonly byTest: readonly { readonly test: TestKind; readonly label: string; readonly count: number }[];
  readonly lastTestAt: string | null;
}

const KNOWN = new Set<string>(TESTS.map((t) => t.test));

/** One row per person, newest to join first. */
export function candidateRows(people: readonly SoloPerson[], sessions: readonly SessionRow[]): CandidateRow[] {
  const mine = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    if (!KNOWN.has(s.type)) continue;
    const list = mine.get(s.candidateId);
    if (list) list.push(s);
    else mine.set(s.candidateId, [s]);
  }
  return people
    .map((p) => {
      const list = mine.get(p.id) ?? [];
      const byTest = TESTS.map(({ test, label }) => ({ test, label, count: list.filter((s) => s.type === test).length })).filter((t) => t.count > 0);
      const lastTestAt = list.reduce<string | null>((latest, s) => (latest === null || Date.parse(s.startedAt) > Date.parse(latest) ? s.startedAt : latest), null);
      return { ...p, attempts: list.length, byTest, lastTestAt };
    })
    .sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt));
}

/** Part of a name or an email, any case. An empty search keeps everyone. */
export function searchCandidates(rows: readonly CandidateRow[], query: string): CandidateRow[] {
  const q = query.trim().toLowerCase().slice(0, 100);
  if (!q) return [...rows];
  return rows.filter((r) => r.fullName.toLowerCase().includes(q) || (r.email ?? '').toLowerCase().includes(q));
}
