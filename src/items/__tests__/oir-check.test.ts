import { describe, it, expect } from 'vitest';
import {
  fillBlanks,
  fromDiffs,
  hamming,
  iterate,
  minimalPeriod,
  normalizeLetters,
  optionLetters,
  parseNumbers,
  splitKey,
} from '../oir/check.ts';

describe('normalizeLetters', () => {
  it('drops spaces and commas, keeps blanks and case', () => {
    expect(normalizeLetters('W _ AT _ WX _ _ Q')).toBe('W_AT_WX__Q');
    expect(normalizeLetters('a, cd, fgh')).toBe('acdfgh');
  });

  it('reads an en dash as a blank (Q103 prints its blanks as dashes)', () => {
    expect(normalizeLetters('c – bba – cab')).toBe('c_bba_cab');
  });
});

describe('optionLetters', () => {
  it('reads a comma list and a plain run the same way', () => {
    expect(optionLetters('c, u, c, r')).toBe('cucr');
    expect(optionLetters('cucr')).toBe('cucr');
  });
});

describe('fillBlanks', () => {
  it('places letters into blanks in order', () => {
    expect(fillBlanks('a_c_', 'bd')).toBe('abcd');
  });

  it('refuses a letter count that does not match the blanks', () => {
    expect(() => fillBlanks('a_c_', 'b')).toThrow(/2 blanks/);
    expect(() => fillBlanks('a_c_', 'bde')).toThrow(/2 blanks/);
  });
});

describe('minimalPeriod', () => {
  it('finds the shortest repeating block, allowing a partial last block', () => {
    expect(minimalPeriod('abcabcab')).toBe(3);
    expect(minimalPeriod('aaaa')).toBe(1);
  });

  it('is null when nothing repeats at least twice', () => {
    expect(minimalPeriod('abcd')).toBeNull();
    expect(minimalPeriod('abcab')).toBeNull();
  });
});

describe('parseNumbers', () => {
  it('reads integers, decimals and printed minus signs', () => {
    expect(parseNumbers('—1, 5, 23')).toEqual([-1, 5, 23]);
    expect(parseNumbers('–4, –1, 4')).toEqual([-4, -1, 4]);
    expect(parseNumbers('1, 1.5, 22.5')).toEqual([1, 1.5, 22.5]);
  });

  it('ignores question marks and dot leaders', () => {
    expect(parseNumbers("4, 7, 12, 19, .?...., 39?")).toEqual([4, 7, 12, 19, 39]);
    expect(parseNumbers("3, 7, '?'")).toEqual([3, 7]);
  });
});

describe('rule builders', () => {
  it('fromDiffs accumulates', () => {
    expect(fromDiffs(9, [11, 13])).toEqual([9, 20, 33]);
  });

  it('iterate applies a step with its index', () => {
    expect(iterate(1, 4, (prev, i) => prev * i)).toEqual([1, 1, 2, 6]);
  });
});

describe('hamming', () => {
  it('counts differing positions and refuses unequal lengths', () => {
    expect(hamming('jicp', 'jlcp')).toBe(1);
    expect(() => hamming('ab', 'abc')).toThrow();
  });
});

describe('splitKey — the database never stores a key next to the question', () => {
  const item = {
    id: 'oir-x-1',
    assessment_type: 'oir_verbal' as const,
    payload: { stem: 's', options: { A: '1', B: '2', C: '3', D: '4' }, key: 'C' as const, reasoningType: 'series' },
    difficulty: 3,
    active: true,
    source: 'src',
  };

  it('moves the key out of the payload', () => {
    const { itemRow, keyRow } = splitKey(item, { sourceRef: 'p1 q1', keyBasis: 'derived', rule: 'r' });
    expect(itemRow.payload).not.toHaveProperty('key');
    expect(itemRow.payload).toEqual({ stem: 's', options: item.payload.options, reasoningType: 'series' });
    expect(keyRow).toEqual({ item_id: 'oir-x-1', key: 'C', key_basis: 'derived', rule: 'r' });
    expect(itemRow).toMatchObject({ id: 'oir-x-1', source_ref: 'p1 q1', difficulty: 3, active: true });
  });

  it('refuses an item with no key', () => {
    const keyless = { stem: 's', options: item.payload.options, reasoningType: 'series' };
    expect(() => splitKey({ ...item, payload: keyless }, { sourceRef: 'x', keyBasis: 'derived', rule: 'r' })).toThrow(/no key/);
  });
});
