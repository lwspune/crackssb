import { describe, it, expect } from 'vitest';
import { adjacent, canShow, cubesFromViews, foldNet, netShows, opposite, oppositeBySight, validateDice } from '../oir/dice.ts';

/**
 * The cube solver behind Chapter 18's keys (D29). A view is a cube drawn
 * corner-on: its top face, the front face (drawn on the left) and the right
 * face. A net is a flat sheet folded with its printed side out.
 */

// The die: top 1, bottom 6, front 2, back 5, right 3, left 4.
const DIE = ['1', '2', '3', '4', '5', '6'];

describe('cubesFromViews', () => {
  it('keeps only the labellings every view allows, and reads the opposite face from them', () => {
    const cubes = cubesFromViews(DIE, [
      { top: '1', left: '2', right: '3' },
      { top: '1', left: '3', right: '5' },
    ]);
    expect(cubes.length).toBeGreaterThan(0);
    expect(opposite(cubes, '2')).toEqual(['5']);
  });

  it('leaves the answer open when the views do not settle it', () => {
    const cubes = cubesFromViews(DIE, [{ top: '1', left: '2', right: '3' }]);
    expect(opposite(cubes, '1').sort()).toEqual(['4', '5', '6']);
  });

  it('refuses a view drawn in mirror image of another: the same corner the other way round', () => {
    expect(cubesFromViews(DIE, [{ top: '1', left: '2', right: '3' }, { top: '1', left: '3', right: '2' }])).toEqual([]);
  });

  it('pads a die that names fewer than six faces with unknown ones', () => {
    const cubes = cubesFromViews(['A', 'B', 'C'], [{ top: 'A', left: 'B', right: 'C' }]);
    expect(opposite(cubes, 'A')).toEqual(['?']);
  });
});

describe('oppositeBySight', () => {
  it('finds the face never seen beside another, as the exam does, ignoring which way round a view is drawn', () => {
    // Drawn in mirror image of each other, so no real cube shows both; by sight, ! is never beside #.
    const views = [
      { top: '#', left: '@', right: '%' },
      { top: '@', left: '!', right: '$' },
      { top: '%', left: '*', right: '!' },
    ];
    expect(cubesFromViews(['#', '@', '%', '!', '$', '*'], views)).toEqual([]);
    expect(oppositeBySight(['#', '@', '%', '!', '$', '*'], views, '!')).toEqual(['#']);
  });

  it('pairs faces off one at a time when a face has a single candidate left', () => {
    // 1 is seen beside 2, 3, 4, 5, so 1-6; 2 beside 3, 4, 6 leaves 5 once 1 is taken.
    const views = [
      { top: '1', left: '2', right: '3' },
      { top: '1', left: '4', right: '5' },
      { top: '2', left: '4', right: '6' },
      { top: '3', left: '6', right: '5' },
    ];
    expect(oppositeBySight(['1', '2', '3', '4', '5', '6'], views, '2')).toEqual(['5']);
  });

  it('leaves it open when sight does not settle it', () => {
    expect(oppositeBySight(['1', '2', '3', '4', '5', '6'], [{ top: '1', left: '2', right: '3' }], '1').sort()).toEqual(['4', '5', '6']);
  });
});

describe('foldNet', () => {
  // A cross:   . A
  //            B C D
  //            . E
  //            . F
  const CROSS = [
    { r: 0, c: 1, face: 'A' },
    { r: 1, c: 0, face: 'B' },
    { r: 1, c: 1, face: 'C' },
    { r: 1, c: 2, face: 'D' },
    { r: 2, c: 1, face: 'E' },
    { r: 3, c: 1, face: 'F' },
  ];

  it('folds a cross: faces two apart in a line are opposite', () => {
    const cube = foldNet(CROSS);
    expect(opposite([cube], 'A')).toEqual(['E']);
    expect(opposite([cube], 'C')).toEqual(['F']);
    expect(opposite([cube], 'B')).toEqual(['D']);
  });

  it('shows a folded corner the right way round, and never its mirror image', () => {
    // Fold with C on top: D (east of C) becomes the right face, E (south of C) the front.
    const cube = foldNet(CROSS);
    expect(canShow(cube, { top: 'C', left: 'E', right: 'D' })).toBe(true);
    expect(canShow(cube, { top: 'C', left: 'D', right: 'E' })).toBe(false);
    expect(canShow(cube, { top: 'C', left: 'F', right: 'D' })).toBe(false);
  });

  it('refuses a sheet that is not one connected net of six squares, or folds two faces onto one', () => {
    expect(() => foldNet(CROSS.slice(0, 5))).toThrow(/six/);
    expect(() => foldNet([...CROSS.slice(0, 5), { r: 5, c: 5, face: 'F' }])).toThrow(/connected/);
    const strip = ['A', 'B', 'C', 'D', 'E', 'F'].map((face, c) => ({ r: 0, c, face }));
    expect(() => foldNet(strip)).toThrow(/onto/);
  });
});

describe('netShows', () => {
  const CROSS = [
    { r: 0, c: 1, face: 'A' },
    { r: 1, c: 0, face: 'B' },
    { r: 1, c: 1, face: 'C' },
    { r: 1, c: 2, face: 'D' },
    { r: 2, c: 1, face: 'E' },
    { r: 3, c: 1, face: 'F' },
  ];

  it('agrees with folding when every face differs', () => {
    expect(netShows(CROSS, { top: 'C', left: 'E', right: 'D' })).toBe(true);
    expect(netShows(CROSS, { top: 'C', left: 'D', right: 'E' })).toBe(false);
    expect(netShows(CROSS, { top: 'A', left: 'E', right: 'D' })).toBe(false);
  });

  it('allows two faces marked alike, either of which may be the one shown', () => {
    const twoBlack = CROSS.map((c) => (c.face === 'B' || c.face === 'D' ? { ...c, face: 'fill' } : c));
    // B and D are opposite: one black face can show, never two.
    expect(netShows(twoBlack, { top: 'C', left: 'E', right: 'fill' })).toBe(true);
    expect(netShows(twoBlack, { top: 'C', left: 'fill', right: 'E' })).toBe(true);
    expect(netShows(twoBlack, { top: 'fill', left: 'C', right: 'fill' })).toBe(false);
  });
});

describe('adjacent', () => {
  it('lists every face that can sit next to one, across all the cubes the views allow', () => {
    const cube = foldNet([
      { r: 0, c: 1, face: 'A' },
      { r: 1, c: 0, face: 'B' },
      { r: 1, c: 1, face: 'C' },
      { r: 1, c: 2, face: 'D' },
      { r: 2, c: 1, face: 'E' },
      { r: 3, c: 1, face: 'F' },
    ]);
    expect(adjacent([cube], 'A').sort()).toEqual(['B', 'C', 'D', 'F']);
  });
});

describe('validateDice', () => {
  it('accepts views and nets, and refuses an empty drawing or a stray field', () => {
    expect(() => validateDice({ views: [{ top: '1', left: '2', right: '3', caption: '(a)' }] })).not.toThrow();
    expect(() => validateDice({ nets: [{ cells: [{ r: 0, c: 0, face: 'pips:3' }] }] })).not.toThrow();
    expect(() => validateDice({})).toThrow();
    expect(() => validateDice({ views: [{ top: '1', left: '2' }] })).toThrow();
    expect(() => validateDice({ views: [], colour: 'red' })).toThrow();
  });
});
