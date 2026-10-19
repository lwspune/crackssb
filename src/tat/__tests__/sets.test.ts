import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { INSTRUMENT_CONFIGS } from '../../runner/modes.ts';
import { PICTURES } from '../pictures.ts';
import { BLANK_ID, SETS, SET_SECONDS, itemRows, setById, slidesOf, testRows } from '../sets.ts';

/**
 * TAT sets (D36): eleven pictures and a blank twelfth, shown in a fixed order,
 * seeded as `tests` rows so a set someone has sat cannot change (0009, 0017).
 */
describe('the TAT sets', () => {
  it('are two, numbered, eleven pictures each', () => {
    expect(SETS.map((s) => s.id)).toEqual(['tat-set-01', 'tat-set-02']);
    for (const s of SETS) expect(s.pictures, s.id).toHaveLength(11);
  });

  it('use only pictures in the manifest, none twice, none in two sets', () => {
    const known = new Set(PICTURES.map((p) => p.id));
    const used = SETS.flatMap((s) => s.pictures);
    for (const id of used) expect(known.has(id), id).toBe(true);
    expect(new Set(used).size).toBe(used.length);
  });

  it('leave the spare out of every set', () => {
    expect(SETS.flatMap((s) => s.pictures)).not.toContain('tat-23');
  });

  it('run twelve slides, the twelfth blank, as the runner and the SSB do', () => {
    expect(INSTRUMENT_CONFIGS.tat.mode === 'stimulus_write' && INSTRUMENT_CONFIGS.tat.itemCount).toBe(12);
    const slides = slidesOf(SETS[0]);
    expect(slides).toHaveLength(12);
    expect(slides[11]).toEqual({ id: BLANK_ID, image: null, title: 'Blank' });
    expect(slides[0]).toEqual({ id: 'tat-01', image: '/tat/tat-01.jpg', title: 'At the managing director’s desk' });
  });

  it('last 54 minutes: twelve times 30 s to look and 4 min to write', () => {
    expect(SET_SECONDS).toBe(12 * (30 + 240));
  });

  it('are found by id, and nothing else is', () => {
    expect(setById('tat-set-02')?.pictures[0]).toBe('tat-12');
    expect(setById('tat-set-09')).toBeUndefined();
  });
});

describe('the blank sheet as a PDF', () => {
  it('ships, six A4 pages, for students to download and print (D38)', () => {
    const pdf = readFileSync(new URL('../../../public/tat-sheet.pdf', import.meta.url));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBe(6);
  });
});

describe('testRows', () => {
  it('makes one `tests` row per set and its twelve `test_items` in order, the blank last', () => {
    const { tests, items } = testRows();
    expect(tests).toEqual([
      { id: 'tat-set-01', assessment_type: 'tat', title: 'TAT set 1', item_count: 12, time_limit_seconds: 3240 },
      { id: 'tat-set-02', assessment_type: 'tat', title: 'TAT set 2', item_count: 12, time_limit_seconds: 3240 },
    ]);
    expect(items.filter((i) => i.test_id === 'tat-set-01').map((i) => [i.ordinal, i.item_id])).toEqual([
      ...SETS[0].pictures.map((id, n) => [n, id]),
      [11, BLANK_ID],
    ]);
    expect(items).toHaveLength(24);
  });
});

describe('itemRows', () => {
  it('makes one `items` row per picture, and the blank: the slide to show, not the ground truth', () => {
    const rows = itemRows();
    expect(rows).toHaveLength(24);
    expect(rows[0]).toEqual({
      id: 'tat-01',
      assessment_type: 'tat',
      difficulty: 2,
      payload: { title: 'At the managing director’s desk', image: '/tat/tat-01.jpg' },
      active: true,
      source: 'owner',
      source_ref: PICTURES[0].source.url,
    });
    expect(rows.at(-1)).toEqual({
      id: BLANK_ID,
      assessment_type: 'tat',
      difficulty: 3,
      payload: { title: 'Blank', image: null },
      active: true,
      source: 'owner',
      source_ref: 'The blank twelfth slide of every TAT set.',
    });
    for (const r of rows) expect(JSON.stringify(r.payload), r.id).not.toMatch(/shows|people/);
  });
});
