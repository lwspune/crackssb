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
