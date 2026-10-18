import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkMocks, extendMocks, isMockable, MOCK_SECONDS, MOCK_SHAPE } from '../mocks.ts';
import type { BankItem, Mock } from '../mocks.ts';

/**
 * OIR mocks (D32): fixed booklets of 30 verbal + 10 non-verbal questions in
 * 20 minutes, practice not a ranking — every question stays in chapter
 * practice too. A question is in at most one mock; only questions whose key
 * is trusted are used; a mock, once written, never changes (new mocks are
 * only ever appended).
 */

const item = (id: string, type: 'oir_verbal' | 'oir_nonverbal', reasoningType: string, over: Partial<BankItem> = {}): BankItem => ({
  id, assessment_type: type, active: true, confidence: 'high', payload: { reasoningType }, ...over,
});

/** A bank with enough for `mocks` mocks: 16 verbal types and 5 non-verbal types, `per` items each. */
function bank(per: number): BankItem[] {
  const out: BankItem[] = [];
  for (let t = 0; t < 16; t++) for (let i = 0; i < per; i++) out.push(item(`v${t}-${i}`, 'oir_verbal', `vt${String(t).padStart(2, '0')}`));
  for (let t = 0; t < 5; t++) for (let i = 0; i < per; i++) out.push(item(`n${t}-${i}`, 'oir_nonverbal', `nt${t}`));
  return out;
}

describe('isMockable', () => {
  it('takes active questions with a trusted key and no shared passage', () => {
    expect(isMockable(item('a', 'oir_verbal', 'series'))).toBe(true);
    expect(isMockable(item('a', 'oir_verbal', 'series', { confidence: 'medium' }))).toBe(false);
    expect(isMockable(item('a', 'oir_verbal', 'series', { active: false }))).toBe(false);
    expect(isMockable(item('a', 'oir_verbal', 'seating', { payload: { reasoningType: 'seating', passage: 'Six friends…' } }))).toBe(false);
  });
});

describe('extendMocks', () => {
  const mocks = extendMocks(bank(12), [], 4, 7);

  it('makes each mock 30 verbal + 10 non-verbal, in 20 minutes', () => {
    expect(MOCK_SHAPE).toEqual({ oir_verbal: 30, oir_nonverbal: 10 });
    expect(MOCK_SECONDS).toBe(1200);
    expect(mocks).toHaveLength(4);
    const types = new Map(bank(12).map((b) => [b.id, b.assessment_type]));
    for (const m of mocks) {
      expect(m.itemIds).toHaveLength(40);
      expect(m.itemIds.filter((id) => types.get(id) === 'oir_verbal')).toHaveLength(30);
      expect(m.timeLimitSeconds).toBe(1200);
    }
  });

  it('numbers and names them', () => {
    expect(mocks.map((m) => [m.id, m.title])).toEqual([
      ['oir-mock-01', 'OIR Mock 1'], ['oir-mock-02', 'OIR Mock 2'], ['oir-mock-03', 'OIR Mock 3'], ['oir-mock-04', 'OIR Mock 4'],
    ]);
  });

  it('puts no question in two mocks', () => {
    const all = mocks.flatMap((m) => m.itemIds);
    expect(new Set(all).size).toBe(all.length);
  });

  it('covers every question type in every mock when the bank allows', () => {
    const typeOf = new Map(bank(12).map((b) => [b.id, b.payload.reasoningType]));
    for (const m of mocks) expect(new Set(m.itemIds.map((id) => typeOf.get(id))).size).toBe(21);
  });

  it('mixes verbal and non-verbal through the booklet rather than in two blocks', () => {
    const firstTen = mocks[0].itemIds.slice(0, 10);
    expect(firstTen.some((id) => id.startsWith('n'))).toBe(true);
    expect(firstTen.some((id) => id.startsWith('v'))).toBe(true);
  });

  it('is the same every time for the same bank and seed', () => {
    expect(extendMocks(bank(12), [], 4, 7)).toEqual(mocks);
  });

  it('only ever appends: existing mocks are kept exactly, and new ones avoid their questions', () => {
    const more = extendMocks(bank(12), mocks.slice(0, 2), 4, 99);
    expect(more.slice(0, 2)).toEqual(mocks.slice(0, 2));
    const used = new Set(mocks.slice(0, 2).flatMap((m) => m.itemIds));
    for (const m of more.slice(2)) for (const id of m.itemIds) expect(used.has(id)).toBe(false);
  });

  it('leaves out questions it cannot use', () => {
    const b = [...bank(12), item('shaky', 'oir_verbal', 'vt00', { confidence: 'medium' })];
    expect(extendMocks(b, [], 4, 7).flatMap((m) => m.itemIds)).not.toContain('shaky');
  });

  it('says so when the bank runs out', () => {
    expect(() => extendMocks(bank(2), [], 4, 7)).toThrow(/not enough oir_verbal questions left for mock 2/i);
  });
});

describe('checkMocks', () => {
  const b = bank(12);
  const good = extendMocks(b, [], 2, 7);

  it('passes good mocks', () => {
    expect(checkMocks(b, good)).toEqual([]);
  });

  it('names each problem', () => {
    // Swap a verbal question for one that does not exist, and another for one mock 1 already has.
    const swap = (m: Mock, to: string) => {
      const i = m.itemIds.findIndex((id) => id.startsWith('v'));
      return { ...m, itemIds: m.itemIds.map((id, j) => (j === i ? to : id)) };
    };
    const repeated = good[0].itemIds.filter((id) => id.startsWith('v'))[1];
    expect(checkMocks(b, [swap(good[0], 'nope'), swap(good[1], repeated)])).toEqual([
      'oir-mock-01: nope is not a usable question',
      'oir-mock-01: 29 verbal + 10 non-verbal, not 30 + 10',
      `oir-mock-02: ${repeated} is also in an earlier mock`,
    ]);
  });
});

describe('content/oir-mocks.json', () => {
  const read = (p: string) => JSON.parse(readFileSync(new URL(`../../../content/${p}`, import.meta.url), 'utf8'));

  it('holds 20 mocks that pass every check against the bank', () => {
    const file = read('oir-mocks.json') as { mocks: Mock[] };
    const items = (read('oir-items.json') as { items: BankItem[] }).items;
    expect(file.mocks).toHaveLength(20);
    expect(checkMocks(items, file.mocks)).toEqual([]);
  });
});
