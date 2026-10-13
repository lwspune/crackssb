import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { assembleBooklet, validateItem, validatePayload } from '../bank.ts';
import type { Item, OirPayload } from '../bank.ts';

const oir = (id: string, reasoningType: string, key: 'A' | 'B' | 'C' | 'D' = 'B', active = true): Item<OirPayload> => ({
  id,
  assessment_type: 'oir_verbal',
  payload: {
    stem: `Stem ${id}`,
    options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    key,
    reasoningType,
  },
  difficulty: 3,
  active,
  source: 'test',
});

describe('validateItem', () => {
  it('accepts a well-formed OIR item', () => {
    expect(validateItem(oir('q1', 'analogy'))).toMatchObject({ id: 'q1', assessment_type: 'oir_verbal' });
  });

  it('keeps an OIR item\'s printed direction, which a bare series cannot be answered without', () => {
    const item = oir('q1', 'series');
    const withDirection = { ...item, payload: { ...item.payload, direction: 'Find the wrong number.' } };
    expect((validateItem(withDirection).payload as OirPayload).direction).toBe('Find the wrong number.');
    expect(() => validateItem({ ...item, payload: { ...item.payload, direction: '' } })).toThrow(/direction/);
  });

  it('keeps the passage a group of OIR questions shares, and refuses an empty one', () => {
    const item = oir('q1', 'seating');
    const withPassage = { ...item, payload: { ...item.payload, passage: 'A, B and C sit in a row.' } };
    expect((validateItem(withPassage).payload as OirPayload).passage).toBe('A, B and C sit in a row.');
    expect(() => validateItem({ ...item, payload: { ...item.payload, passage: '' } })).toThrow(/passage/);
  });

  it('keeps the printed tables of a number-grid question, a blank cell as an empty string', () => {
    const item = oir('q1', 'missing_term');
    const tables = [[['13', '26', '39'], ['30', '42', '?']], [['', '4', ''], ['4', '10', '9'], ['', '16', '']]];
    expect((validateItem({ ...item, payload: { ...item.payload, tables } }).payload as OirPayload).tables).toEqual(tables);
  });

  it('refuses a table with no rows, a ragged row, or nothing printed in it', () => {
    const item = oir('q1', 'missing_term');
    const bad = (tables: unknown) => () => validateItem({ ...item, payload: { ...item.payload, tables } });
    expect(bad([])).toThrow(/tables/);
    expect(bad([[]])).toThrow(/tables/);
    expect(bad([[['1', '2'], ['3']]])).toThrow(/tables/);
    expect(bad([[['', ''], ['', '']]])).toThrow(/tables/);
  });

  it('keeps a redrawn figure on a non-verbal item, and refuses a malformed one (D29)', () => {
    const item = { ...oir('nv1', 'counting_figures'), assessment_type: 'oir_nonverbal' as const };
    const figure = { lines: [[0, 0, 10, 0], [10, 0, 5, 8], [5, 8, 0, 0]], circles: [[5, 3, 6]] };
    expect((validateItem({ ...item, payload: { ...item.payload, figure } }).payload as OirPayload).figure).toEqual(figure);
    expect(() => validateItem({ ...item, payload: { ...item.payload, figure: { lines: [] } } })).toThrow(/figure/);
    expect(() => validateItem({ ...item, payload: { ...item.payload, figure: { lines: [[1, 1, 1, 1]] } } })).toThrow(/figure/);
  });

  it('keeps a dice drawing on a non-verbal item, and refuses an empty one (D29)', () => {
    const item = { ...oir('nv2', 'cubes_dice'), assessment_type: 'oir_nonverbal' as const };
    const dice = { views: [{ top: '1', left: '2', right: 'pips:3', caption: '(a)' }] };
    expect((validateItem({ ...item, payload: { ...item.payload, dice } }).payload as OirPayload).dice).toEqual(dice);
    expect(() => validateItem({ ...item, payload: { ...item.payload, dice: {} } })).toThrow(/dice/);
  });

  it('keeps picture answers, one per option, each a figure, a dice drawing or a row of glyphs (D29)', () => {
    const item = { ...oir('nv3', 'mirror'), assessment_type: 'oir_nonverbal' as const };
    const answerPanels = {
      A: { glyphs: [{ ch: 'b', flip: 'x' }, { ch: 'a' }] },
      B: { figure: { lines: [], circles: [[0, 0, 1]], labels: [[0, 0, 'A']] } },
      C: { dice: { views: [{ top: '1', left: '2', right: '3' }] } },
      D: { glyphs: [{ ch: 'a', flip: 'y' }] },
    };
    expect((validateItem({ ...item, payload: { ...item.payload, answerPanels } }).payload as OirPayload).answerPanels).toEqual(answerPanels);
  });

  it('refuses picture answers that miss an option, draw nothing, or draw two things in one panel', () => {
    const item = { ...oir('nv4', 'mirror'), assessment_type: 'oir_nonverbal' as const };
    const g = { glyphs: [{ ch: 'a' }] };
    const bad = (answerPanels: unknown) => () => validateItem({ ...item, payload: { ...item.payload, answerPanels } });
    expect(bad({ A: g, B: g, C: g })).toThrow(/answerPanels/);
    expect(bad({ A: {}, B: g, C: g, D: g })).toThrow(/answerPanels/);
    expect(bad({ A: { ...g, figure: { lines: [[0, 0, 1, 1]] } }, B: g, C: g, D: g })).toThrow(/answerPanels/);
    expect(bad({ A: { glyphs: [{ ch: 'ab' }] }, B: g, C: g, D: g })).toThrow(/answerPanels/);
  });

  it('every row of the seeded WAT bank validates as a payload', () => {
    const { items: rows } = JSON.parse(readFileSync('content/wat-items.json', 'utf8')) as { items: Array<{ payload: unknown }> };
    expect(rows.length).toBe(60);
    for (const r of rows) expect(() => validatePayload('wat', r.payload)).not.toThrow();
  });

  it('OIR needs a stem, four options, a key that is one of them, and a reasoning type', () => {
    const base = oir('q1', 'analogy');
    expect(() => validateItem({ ...base, payload: { ...base.payload, stem: '' } })).toThrow(/stem/);
    expect(() => validateItem({ ...base, payload: { ...base.payload, options: { A: 'a', B: 'b', C: 'c' } } })).toThrow(/options/);
    expect(() => validateItem({ ...base, payload: { ...base.payload, key: 'E' } })).toThrow(/key/);
    expect(() => validateItem({ ...base, payload: { ...base.payload, reasoningType: '' } })).toThrow(/reasoningType/);
  });

  it('WAT needs a word; SRT needs a situation', () => {
    expect(() => validatePayload('wat', { word: '' })).toThrow(/word/);
    expect(() => validatePayload('srt', { situation: '' })).toThrow(/situation/);
    expect(validatePayload('srt', { situation: 'He was walking when...' })).toEqual({ situation: 'He was walking when...' });
  });

  it('difficulty is an integer 1–5; active is boolean; source is non-empty', () => {
    const base = oir('q1', 'analogy');
    expect(() => validateItem({ ...base, difficulty: 0 })).toThrow(/difficulty/);
    expect(() => validateItem({ ...base, difficulty: 2.5 })).toThrow(/difficulty/);
    expect(() => validateItem({ ...base, active: 'yes' })).toThrow(/active/);
    expect(() => validateItem({ ...base, source: '' })).toThrow(/source/);
  });
});

describe('assembleBooklet', () => {
  const bank: Item[] = [
    ...Array.from({ length: 6 }, (_, i) => oir(`an${i}`, 'analogy')),
    ...Array.from({ length: 6 }, (_, i) => oir(`se${i}`, 'series', 'C')),
    ...Array.from({ length: 6 }, (_, i) => oir(`cl${i}`, 'classification', 'D')),
    oir('dead', 'analogy', 'A', false),
    { ...oir('nv', 'series'), id: 'nv', assessment_type: 'oir_nonverbal' },
  ];

  it('releases items without the key, and returns the key separately', () => {
    const { released, answerKey } = assembleBooklet(bank, { type: 'oir_verbal', count: 6, seed: 1 });
    expect(released).toHaveLength(6);
    for (const r of released) {
      expect(Object.keys(r.payload)).not.toContain('key');
      expect(r.payload).toMatchObject({ stem: expect.any(String), options: expect.any(Object), reasoningType: expect.any(String) });
    }
    expect(Object.keys(answerKey)).toHaveLength(6);
    expect(released.map((r) => r.ordinal)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('is deterministic for a seed and different across seeds', () => {
    const a = assembleBooklet(bank, { type: 'oir_verbal', count: 9, seed: 42 }).released.map((r) => r.id);
    const b = assembleBooklet(bank, { type: 'oir_verbal', count: 9, seed: 42 }).released.map((r) => r.id);
    const c = assembleBooklet(bank, { type: 'oir_verbal', count: 9, seed: 43 }).released.map((r) => r.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('balances across reasoning types', () => {
    const { released } = assembleBooklet(bank, { type: 'oir_verbal', count: 9, seed: 7 });
    const byType = released.reduce<Record<string, number>>((m, r) => {
      const t = (r.payload as { reasoningType: string }).reasoningType;
      m[t] = (m[t] ?? 0) + 1;
      return m;
    }, {});
    expect(byType).toEqual({ analogy: 3, series: 3, classification: 3 });
  });

  it('never picks an inactive item or one of another type', () => {
    const ids = assembleBooklet(bank, { type: 'oir_verbal', count: 18, seed: 3 }).released.map((r) => r.id);
    expect(ids).not.toContain('dead');
    expect(ids).not.toContain('nv');
    expect(new Set(ids).size).toBe(18);
  });

  it('refuses when the bank cannot fill the count', () => {
    expect(() => assembleBooklet(bank, { type: 'oir_verbal', count: 19, seed: 1 })).toThrow(/18 active/);
    expect(() => assembleBooklet(bank, { type: 'oir_verbal', count: 0, seed: 1 })).toThrow(/count/);
  });

  it('the answer key maps ordinal to the key of the item at that ordinal', () => {
    const { released, answerKey } = assembleBooklet(bank, { type: 'oir_verbal', count: 6, seed: 5 });
    for (const r of released) {
      const src = bank.find((b) => b.id === r.id) as Item<OirPayload>;
      expect(answerKey[r.ordinal]).toBe(src.payload.key);
    }
  });
});
