import { describe, it, expect } from 'vitest';
import { imageOf, sameGlyphs } from '../oir/mirror.ts';

/** Mirror and water images of printed text, glyph by glyph (D29). */
describe('imageOf', () => {
  it('reverses the order and flips each glyph across a mirror on the right', () => {
    expect(imageOf('ab', 'mirror')).toEqual([{ ch: 'b', flip: 'x' }, { ch: 'a', flip: 'x' }]);
  });

  it('keeps the order and flips each glyph upside down in water below', () => {
    expect(imageOf('ab', 'water')).toEqual([{ ch: 'a', flip: 'y' }, { ch: 'b', flip: 'y' }]);
  });

  it('keeps spaces as they fall', () => {
    expect(imageOf('a b', 'mirror').map((g) => g.ch).join('')).toBe('b a');
  });
});

describe('sameGlyphs', () => {
  it('treats a flip that leaves a symmetric letter unchanged as no flip', () => {
    // A and O look the same mirrored; b does not.
    expect(sameGlyphs([{ ch: 'A' }, { ch: 'O', flip: 'x' }], [{ ch: 'A', flip: 'x' }, { ch: 'O' }])).toBe(true);
    expect(sameGlyphs([{ ch: 'b' }], [{ ch: 'b', flip: 'x' }])).toBe(false);
    // Upside down: B, C, D, E, K keep their shape; A does not.
    expect(sameGlyphs([{ ch: 'B', flip: 'y' }], [{ ch: 'B' }])).toBe(true);
    expect(sameGlyphs([{ ch: 'A', flip: 'y' }], [{ ch: 'A' }])).toBe(false);
  });

  it('compares letter by letter and needs the same length', () => {
    expect(sameGlyphs([{ ch: 'a' }], [{ ch: 'a' }, { ch: 'b' }])).toBe(false);
    expect(sameGlyphs([{ ch: 'a' }], [{ ch: 'e' }])).toBe(false);
  });

  it('knows arrows and triangles pointing up or down look the same reversed', () => {
    expect(sameGlyphs([{ ch: '↑', flip: 'x' }, { ch: '▽', flip: 'x' }], [{ ch: '↑' }, { ch: '▽' }])).toBe(true);
    expect(sameGlyphs([{ ch: '↑', flip: 'y' }], [{ ch: '↑' }])).toBe(false);
  });

  it('knows N, S and Z look the same turned half round, so upside down is the same as reversed', () => {
    expect(sameGlyphs([{ ch: 'N', flip: 'xy' }], [{ ch: 'N' }])).toBe(true);
    expect(sameGlyphs([{ ch: 'S', flip: 'y' }], [{ ch: 'S', flip: 'x' }])).toBe(true);
    expect(sameGlyphs([{ ch: 'Z', flip: 'y' }], [{ ch: 'Z' }])).toBe(false);
  });
});
