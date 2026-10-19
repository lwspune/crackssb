import { describe, it, expect } from 'vitest';
import { candidateRows, searchCandidates } from '../candidates.ts';
import type { SoloPerson } from '../candidates.ts';

const person = (id: string, over: Partial<SoloPerson> = {}): SoloPerson => ({
  id,
  fullName: `Fixture ${id}`,
  email: `${id}@example.invalid`,
  joinedVia: 'google',
  joinedAt: '2026-10-01T10:00:00Z',
  deactivated: false,
  ...over,
});

describe('candidateRows — the owner’s list of candidates with no academy', () => {
  it('lists the newest to join first', () => {
    const rows = candidateRows([person('a', { joinedAt: '2026-10-01T00:00:00Z' }), person('b', { joinedAt: '2026-10-05T00:00:00Z' })], []);
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('counts each person’s attempts by test, in SSB order, leaving out tests not taken', () => {
    const [row] = candidateRows([person('a')], [
      { candidateId: 'a', type: 'tat', startedAt: '2026-10-02T00:00:00Z' },
      { candidateId: 'a', type: 'oir', startedAt: '2026-10-03T00:00:00Z' },
      { candidateId: 'a', type: 'oir', startedAt: '2026-10-04T00:00:00Z' },
      { candidateId: 'a', type: 'ppdt', startedAt: '2026-10-01T00:00:00Z' },
    ]);
    expect(row.attempts).toBe(4);
    expect(row.byTest).toEqual([
      { test: 'oir', label: 'OIR', count: 2 },
      { test: 'ppdt', label: 'PPDT', count: 1 },
      { test: 'tat', label: 'TAT', count: 1 },
    ]);
    expect(row.lastTestAt).toBe('2026-10-04T00:00:00Z');
  });

  it('gives someone who has taken nothing no attempts and no last test', () => {
    const [row] = candidateRows([person('a')], []);
    expect(row).toMatchObject({ attempts: 0, byTest: [], lastTestAt: null });
  });

  it('ignores sessions of anyone not listed, and types it does not know', () => {
    const [row] = candidateRows([person('a')], [
      { candidateId: 'z', type: 'oir', startedAt: '2026-10-02T00:00:00Z' },
      { candidateId: 'a', type: 'gto', startedAt: '2026-10-02T00:00:00Z' },
    ]);
    expect(row).toMatchObject({ attempts: 0, lastTestAt: null });
  });
});

describe('searchCandidates', () => {
  const rows = candidateRows([person('a', { fullName: 'Arjun Mehta', email: 'arjun@gmail.com' }), person('b', { fullName: 'Kavya Rao', email: 'kr@outlook.com' })], []);

  it('matches part of a name or an email, ignoring case and spaces around it', () => {
    expect(searchCandidates(rows, '  mEhTa ').map((r) => r.id)).toEqual(['a']);
    expect(searchCandidates(rows, 'outlook').map((r) => r.id)).toEqual(['b']);
  });

  it('returns everyone for an empty search, and no one for a miss', () => {
    expect(searchCandidates(rows, '')).toHaveLength(2);
    expect(searchCandidates(rows, '   ')).toHaveLength(2);
    expect(searchCandidates(rows, 'nobody')).toEqual([]);
  });

  it('copes with a person whose email is missing', () => {
    const [noEmail] = candidateRows([person('c', { email: null, fullName: 'No Mail' })], []);
    expect(searchCandidates([noEmail], 'mail')).toHaveLength(1);
    expect(searchCandidates([noEmail], '@')).toEqual([]);
  });
});
