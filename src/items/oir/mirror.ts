import { z } from 'zod';

/**
 * Printed text seen in a mirror or in water (D29), glyph by glyph. A glyph is
 * one character, drawn as printed, flipped left to right ('x'), upside down
 * ('y'), or both. A mirror on the right reverses the order and flips each
 * glyph across; water below keeps the order and turns each upside down.
 */

export interface Glyph {
  readonly ch: string;
  readonly flip?: 'x' | 'y' | 'xy';
}

export const glyphSchema = z.object({ ch: z.string().refine((s) => [...s].length === 1, 'a glyph is one character'), flip: z.enum(['x', 'y', 'xy']).optional() }).strict();

/** The image of printed text in a mirror on its right, or in water below it. */
export function imageOf(text: string, where: 'mirror' | 'water'): Glyph[] {
  const glyphs = [...text].map((ch) => ({ ch, flip: (where === 'mirror' ? 'x' : 'y') as Glyph['flip'] }));
  return (where === 'mirror' ? glyphs.reverse() : glyphs).map((g) => (g.ch === ' ' ? { ch: ' ' } : g));
}

/** Letters and digits that look the same flipped left to right, and upside down (as printed in the book's sans-serif). */
const SAME_ACROSS = new Set([...'AHIMOTUVWXYilovwx08 ']);
const SAME_UPSIDE_DOWN = new Set([...'BCDEHIKOXclox038 ']);

/** The flip that is left once flips a glyph's symmetry hides are removed. */
function visible(g: Glyph): string {
  let x = g.flip === 'x' || g.flip === 'xy';
  let y = g.flip === 'y' || g.flip === 'xy';
  if (SAME_ACROSS.has(g.ch)) x = false;
  if (SAME_UPSIDE_DOWN.has(g.ch)) y = false;
  return `${g.ch}|${x ? 'x' : ''}${y ? 'y' : ''}`;
}

/** Do two rows of glyphs look the same on the page? */
export function sameGlyphs(a: readonly Glyph[], b: readonly Glyph[]): boolean {
  return a.length === b.length && a.every((g, i) => visible(g) === visible(b[i]));
}
