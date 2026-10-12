import { describe, it, expect } from 'vitest';
import {
  ALPHABETS,
  between,
  fillBlanks,
  fromLeft,
  fromRight,
  leftOf,
  middleOf,
  posFromLeft,
  posFromRight,
  rightOf,
  fromDiffs,
  hamming,
  iterate,
  lettersShort,
  minimalPeriod,
  ordinal,
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

describe('lettersShort', () => {
  it('is empty when the candidate can be made from the word, each letter used as often as it appears', () => {
    expect(lettersShort('ADMINISTRATION', 'RATION')).toEqual([]);
    expect(lettersShort('CONDUCT', 'Duct')).toEqual([]);
  });

  it('names a letter the word does not have', () => {
    expect(lettersShort('IMPOSSIO-NABLE?', 'IMPASSIVE')).toEqual([{ letter: 'V', need: 1, have: 0 }]);
  });

  it('names a letter needed more often than the word has it', () => {
    expect(lettersShort('ELECTRICIANS', 'STRICT')).toEqual([{ letter: 'T', need: 2, have: 1 }]);
  });

  it('reads letters only, in either case', () => {
    expect(lettersShort('Conduct', 'COUNTED')).toEqual([{ letter: 'E', need: 1, have: 0 }]);
  });
});

describe('alphabet positions', () => {
  const abc = ALPHABETS.normal;

  it('builds the four orders the book uses', () => {
    expect(ALPHABETS.normal).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    expect(ALPHABETS.firstHalfReversed).toBe('MLKJIHGFEDCBANOPQRSTUVWXYZ');
    expect(ALPHABETS.secondHalfReversed).toBe('ABCDEFGHIJKLMZYXWVUTSRQPON');
    expect(ALPHABETS.reversed).toBe('ZYXWVUTSRQPONMLKJIHGFEDCBA');
  });

  it('reads a letter by position from either end, and a position from a letter', () => {
    expect(fromLeft(abc, 13)).toBe('M');
    expect(fromRight(abc, 15)).toBe('L');
    expect(posFromLeft(abc, 'S')).toBe(19);
    expect(posFromRight(abc, 'K')).toBe(16);
  });

  it('counts to the left and right, and says null off either end', () => {
    expect(rightOf(abc, 'M', 7)).toBe('T');
    expect(leftOf(abc, 'W', 12)).toBe('K');
    expect(leftOf(abc, 'F', 16)).toBeNull();
    expect(fromLeft(abc, 27)).toBeNull();
  });

  it('finds the middle letter, or null when an even number lie between', () => {
    expect(middleOf(abc, 'E', 'O')).toBe('J');
    expect(middleOf(abc, 'O', 'E')).toBe('J');
    expect(middleOf(abc, 'H', 'S')).toBeNull();
  });

  it('counts the letters strictly between two', () => {
    expect(between(abc, 'R', 'C')).toBe(14);
    expect(between(abc, 'A', 'B')).toBe(0);
  });
});

describe('ordinal', () => {
  it('writes a rank as the book prints it', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 28, 31].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '28th', '31st']);
  });
});

