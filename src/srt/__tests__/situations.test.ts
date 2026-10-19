import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { INSTRUMENT_CONFIGS } from '../../runner/modes.ts';
import { HELD, SETS, SET_SECONDS, SITUATIONS, itemRows, setById, testRows } from '../situations.ts';

/**
 * SRT (D39): 120 situations the owner chose from a practice site, in the third
 * person as the SSB booklet reads, with the site's wording kept beside each;
 * two sets of sixty, seeded as `tests` rows so a set someone has sat cannot
 * change (0009). Never the site's model responses.
 */
describe('the SRT situations', () => {
  it('are 120, numbered in order, and every source situation is kept or held with a reason', () => {
    expect(SITUATIONS.map((s) => s.id)).toEqual(Array.from({ length: 120 }, (_, i) => `srt-${String(i + 1).padStart(3, '0')}`));
    expect(SITUATIONS.length + HELD.length).toBe(150);
    for (const h of HELD) expect(h.reason.length, `${h.part}.${h.n}`).toBeGreaterThan(5);
  });

  it('read in the third person, as at the SSB: no "you" or "your" left', () => {
    for (const s of SITUATIONS) expect(s.text, s.id).not.toMatch(/\byou(r|rs|rself)?\b/i);
  });

  it('say where each came from, and keep the site’s wording', () => {
    for (const s of SITUATIONS) {
      expect(s.source.url, s.id).toMatch(/^https:\/\/ssbcrackexams\.com\/15-sample-srt-situations-with-responses-for-ssb-interview-part-\d+\/$/);
      expect(s.source.wording.length, s.id).toBeGreaterThan(10);
    }
  });

  it('carry no model responses', () => {
    expect(JSON.stringify(SITUATIONS)).not.toMatch(/response:|answer:|"he will/i);
  });
});

describe('the SRT sets', () => {
  it('are two sets of sixty, every situation in exactly one', () => {
    expect(SETS.map((s) => [s.id, s.situations.length])).toEqual([['srt-set-01', 60], ['srt-set-02', 60]]);
    const used = SETS.flatMap((s) => s.situations);
    expect(new Set(used).size).toBe(120);
    expect([...used].sort()).toEqual(SITUATIONS.map((s) => s.id));
  });

  it('last thirty minutes, as the runner and the SSB do', () => {
    expect(INSTRUMENT_CONFIGS.srt).toMatchObject({ mode: 'booklet', itemCount: 60, timeLimitSeconds: 1800 });
    expect(SET_SECONDS).toBe(1800);
  });

  it('are found by id, and nothing else is', () => {
    expect(setById('srt-set-02')?.situations).toHaveLength(60);
    expect(setById('srt-set-09')).toBeUndefined();
  });
});

describe('rows', () => {
  it('makes one `items` row per situation, its text and nothing else', () => {
    const rows = itemRows();
    expect(rows).toHaveLength(120);
    expect(rows[0]).toEqual({
      id: 'srt-001',
      assessment_type: 'srt',
      difficulty: 3,
      payload: { text: SITUATIONS[0].text },
      active: true,
      source: 'owner',
      source_ref: SITUATIONS[0].source.url,
    });
  });

  it('makes one `tests` row per set and its sixty `test_items` in order', () => {
    const { tests, items } = testRows();
    expect(tests).toEqual([
      { id: 'srt-set-01', assessment_type: 'srt', title: 'SRT set 1', item_count: 60, time_limit_seconds: 1800 },
      { id: 'srt-set-02', assessment_type: 'srt', title: 'SRT set 2', item_count: 60, time_limit_seconds: 1800 },
    ]);
    expect(items.filter((i) => i.test_id === 'srt-set-02').map((i) => i.item_id)).toEqual(SETS[1].situations);
    expect(items).toHaveLength(120);
  });
});

describe('the blank sheet as a PDF', () => {
  it('ships, 4 A4 pages, for students to download and print (D38)', () => {
    const pdf = readFileSync(new URL('../../../public/srt-sheet.pdf', import.meta.url));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(4);
  });
});
