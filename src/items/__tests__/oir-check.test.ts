import { describe, it, expect } from 'vitest';
import {
  ALPHABETS,
  bearingName,
  evaluate,
  holds,
  substitute,
  swapIn,
  between,
  charMap,
  facingName,
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
  solveCodes,
  splitKey,
  walk,
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

describe('walk', () => {
  it('moves along the heading and turns left and right by 90°', () => {
    const w = walk('N', [20, 'R', 20, 'R', 20]);
    expect([w.x, w.y, w.heading]).toEqual([20, 0, 180]);
  });

  it('turns by any angle, clockwise positive, and can face a new direction outright', () => {
    expect(walk('S', [{ turn: 90 }, { turn: 180 }, { turn: -180 }, { turn: -45 }]).heading).toBe(225);
    expect(walk('E', [10, { face: 'S' }, 5]).y).toBe(-5);
  });

  it('moves diagonally on a 45° heading', () => {
    const w = walk('NW', [30, { face: 'SW' }, 30, { face: 'SE' }, 30, { face: 'NE' }, 30]);
    expect(Math.hypot(w.x, w.y)).toBeCloseTo(0, 9);
  });
});

describe('facingName and bearingName', () => {
  it('names the eight compass points, and nothing between them', () => {
    expect([0, 45, 90, 135, 180, 225, 270, 315, 360, -90].map(facingName)).toEqual(['North', 'North-East', 'East', 'South-East', 'South', 'South-West', 'West', 'North-West', 'North', 'West']);
    expect(facingName(330)).toBeNull();
  });

  it('names where a point lies by quadrant, as the book does', () => {
    expect(bearingName(0, 1.5)).toBe('North');
    expect(bearingName(500, -250)).toBe('South-East');
    expect(bearingName(-26, -5)).toBe('South-West');
    expect(bearingName(1e-12, 0)).toBeNull();
  });
});

describe('solveCodes', () => {
  it('pins each word by intersecting the phrases it appears in', () => {
    const codes = solveCodes([
      ['he is late', 'ah hu lu'],
      ['she is expected', 'bo hu ma'],
      ['she arrived late', 'bo ka lu'],
    ]);
    expect(codes.get('arrived')).toEqual(new Set(['ka']));
    expect(codes.get('is')).toEqual(new Set(['hu']));
  });

  it('leaves a word open when the phrases cannot separate it', () => {
    const codes = solveCodes([
      ['chips are good', 'lo pur tan'],
      ['soul are mate', 'tan fu gil'],
      ['chips contain metal', 'pur st mo'],
    ]);
    expect(codes.get('contain')).toEqual(new Set(['st', 'mo']));
  });

  it('works on letters and digits written without spaces, on either side', () => {
    const codes = solveCodes([
      ['BEAM', '2349'],
      ['MEAN', '4327'],
    ], { words: '', codes: '' });
    expect(codes.get('N')).toEqual(new Set(['7']));
    const mixed = solveCodes([
      ['my mistake', '62'],
      ['big mistake', '29'],
    ], { words: ' ', codes: '' });
    expect(mixed.get('my')).toEqual(new Set(['6']));
  });
});

describe('charMap', () => {
  it('reads a letter-for-symbol code from examples, refusing a letter coded two ways', () => {
    const m = charMap([['TOUR', '1234'], ['CLEAR', '56784']]);
    expect(m.get('R')).toBe('4');
    expect(() => charMap([['AB', '12'], ['AC', '34']])).toThrow(/A/);
  });
});


describe('evaluate', () => {
  it('works a printed sum in the usual order: brackets, then × and ÷, then + and −', () => {
    expect(evaluate('18 × 3 − 4 ÷ 2 + 7')).toBe(59);
    expect(evaluate('(9 × 3 + 169 ÷ 13) × 5 − 10 + 16')).toBe(206);
    expect(evaluate('6 ÷ 3 × 2')).toBe(4);
  });

  it('reads the minus as the book prints it (−, – or -), a negative number, and a decimal', () => {
    expect(evaluate('87 ÷ 3 + 39 – 67 × 3')).toBe(-133);
    expect(evaluate('−4 × −3')).toBe(12);
    expect(evaluate('3 ÷ 6 − 2 + 4 × 7')).toBe(26.5);
  });

  it('refuses anything that is not a sum, rather than guessing', () => {
    expect(() => evaluate('2 + ')).toThrow();
    expect(() => evaluate('2 # 3')).toThrow(/#/);
    expect(() => evaluate('(2 + 3')).toThrow();
  });
});

describe('holds', () => {
  it('is true when both sides of the one = agree', () => {
    expect(holds('25 ÷ 5 × 6 + 20 = 62 − 12')).toBe(true);
    expect(holds('25 × 5 ÷ 6 + 20 = 62 − 12')).toBe(false);
  });

  it('is false, not an error, for a swap that leaves no = or two', () => {
    expect(holds('12 + 6 × 2 − 24 ÷ 8 − 3')).toBe(false);
    expect(holds('1 = 1 = 1')).toBe(false);
  });
});

describe('substitute', () => {
  it('reads every symbol at once, so a swap of + and × does not undo itself', () => {
    expect(substitute('2 + 3 × 4', { '+': '×', '×': '+' })).toBe('2 × 3 + 4');
    expect(substitute('36 B 17 D 59', { B: '×', D: '−' })).toBe('36 × 17 − 59');
  });

  it('keeps the minus of a negative number, which is part of the number and not a sign', () => {
    expect(substitute('87 ÷ 3 = −133', { '÷': '−', '−': '÷' })).toBe('87 − 3 = −133');
    expect(substitute('−4 × (−3) − 2', { '−': '+' })).toBe('−4 × (−3) + 2');
  });

  it('leaves numbers alone, even when a digit is a key', () => {
    expect(substitute('12 @ 2', { '@': '+', 2: '9' })).toBe('12 + 2');
  });
});

describe('swapIn', () => {
  it('swaps two signs everywhere, and two numbers by value', () => {
    expect(swapIn('26 + 2 ÷ 4 − 8 × 25 = 30', ['×', '+'])).toBe('26 × 2 ÷ 4 − 8 + 25 = 30');
    expect(swapIn('12 ÷ 4 × 16 + 2 − 7 = 43', ['+', '−'], ['2', '7'])).toBe('12 ÷ 4 × 16 − 7 + 2 = 43');
  });

  it('does not touch a number that only contains the swapped one', () => {
    expect(swapIn('12 + 2 = 14', ['+', '+'], ['2', '5'])).toBe('12 + 5 = 14');
  });
});
