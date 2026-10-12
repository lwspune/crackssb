import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { parseFindings, FORBIDDEN, assertGrounded } from '../report/findings.ts';
import type { Findings } from '../report/findings.ts';

type FindingsFile = { candidates: Record<string, unknown> };

// Committed: synthetic, same shapes as the real file (D21). Local only: the hand-derived findings.
const file = JSON.parse(readFileSync('src/scoring/__tests__/fixtures/findings-sample.json', 'utf8')) as FindingsFile;
const PRIVATE = 'corpus/report-findings.json';
const base = (): Findings => parseFindings(file.candidates['sample-complete']);

describe('parseFindings — the report reader contract', () => {
  it('every sample in the fixture parses', () => {
    for (const n of Object.keys(file.candidates)) expect(() => parseFindings(file.candidates[n])).not.toThrow();
  });

  it.skipIf(!existsSync(PRIVATE))('every hand-derived candidate parses (local only — the file is gitignored)', () => {
    const real = JSON.parse(readFileSync(PRIVATE, 'utf8')) as FindingsFile;
    const names = Object.keys(real.candidates);
    expect(names.length).toBeGreaterThanOrEqual(7);
    for (const n of names) expect(() => parseFindings(real.candidates[n])).not.toThrow();
  });

  it('carries the shape the renderer consumes', () => {
    const f = base();
    expect(f.counts.tat).toEqual([11, 12]);
    expect(f.strengths[0]).toMatchObject({ story: expect.any(Number), quote: expect.any(String), why: expect.any(String) });
    expect(f.perception).toBeNull();
    expect(Array.isArray(f.priorities)).toBe(true);
  });

  it('a missing instrument is null, not zeros', () => {
    const f = parseFindings(file.candidates['sample-tat-only']);
    expect(f.counts.srt).toBeNull();
    expect(f.counts.wat).toBeNull();
  });

  it('perception, when present, names what was written against what the picture shows', () => {
    const f = parseFindings(file.candidates['sample-perception']);
    expect(f.perception).toMatchObject({ story: 7, wrote: expect.any(String), shows: expect.any(String) });
  });

  it('rejects an unknown top-level field — the renderer must not grow silent inputs', () => {
    expect(() => parseFindings({ ...base(), assessorNote: 'x' })).toThrow(/assessorNote/);
  });
});

describe('D16 — grounding is enforced at the boundary, whatever produced the findings', () => {
  const cases: Array<[string, string]> = [
    ['assessor marks', 'The assessor marked this story down.'],
    ['cohort count', 'Eight of ten candidates wrote a lift here.'],
    ['peer comparison', 'You did better than most.'],
    ['ranking', 'You ranked third on SRT.'],
    ['batch', 'Strongest in the batch at WAT.'],
    ['the phrase that slipped past the first guard', 'You answered 29 situations — more than most manage.'],
    ['other candidates', 'Unlike other candidates, you finished.'],
  ];

  for (const [label, text] of cases) {
    it(`rejects: ${label}`, () => {
      expect(() => parseFindings({ ...base(), closing: text })).toThrow(/D16/);
    });
  }

  it('checks every string field, including nested ones', () => {
    const f = base();
    const bad = { ...f, strengths: [{ ...f.strengths[0], why: 'Better than your peers.' }] };
    expect(() => parseFindings(bad)).toThrow(/D16/);
    const badCraft = { ...f, craft: [...f.craft, 'Most candidates make this error.'] };
    expect(() => parseFindings(badCraft)).toThrow(/D16/);
  });

  it('ordinary candidate-grounded prose passes', () => {
    expect(() => assertGrounded('Story 7 resolves through the hero acting himself.')).not.toThrow();
    expect(FORBIDDEN.test('You left 24 of 60 blank.')).toBe(false);
  });
});

describe('structural rules the regex cannot express', () => {
  it('a story reference must be within the twelve slides', () => {
    const f = base();
    expect(() => parseFindings({ ...f, strengths: [{ story: 13, quote: 'q', why: 'w' }] })).toThrow(/story/);
    expect(() => parseFindings({ ...f, themeIssues: [{ story: 0, what: 'q', why: 'w' }] })).toThrow(/story/);
    expect(() => parseFindings({ ...f, incomplete: [12, 14] })).toThrow(/incomplete/);
  });

  it('a story cannot be both blank and incomplete', () => {
    const f = base();
    expect(() => parseFindings({ ...f, incomplete: [4, 5], blank: [4] })).toThrow(/both blank and incomplete/);
  });

  it('counts are [attempted, target] with attempted ≤ target', () => {
    const f = base();
    expect(() => parseFindings({ ...f, counts: { ...f.counts, tat: [13, 12] } })).toThrow(/counts/);
  });
});
