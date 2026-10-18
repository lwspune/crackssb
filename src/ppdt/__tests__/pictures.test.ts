import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { PICTURES, pictureById } from '../pictures.ts';

/**
 * The PPDT pictures (D33): ten slides — five sketches supplied by the owner,
 * five licensed photos — each with the ground truth the feedback checks
 * against, where it came from, and how it was made into a slide.
 */
const root = new URL('../../../', import.meta.url);
const file = (p: string) => new URL(p, root);

describe('the PPDT pictures', () => {
  it('are ten, numbered in order', () => {
    expect(PICTURES.map((p) => p.id)).toEqual(Array.from({ length: 10 }, (_, i) => `ppdt-${String(i + 1).padStart(2, '0')}`));
  });

  it('run from clear to very ambiguous: 3 clear, 3 hazy, 4 ambiguous', () => {
    expect(PICTURES.map((p) => p.difficulty)).toEqual(['clear', 'clear', 'clear', 'hazy', 'hazy', 'hazy', 'ambiguous', 'ambiguous', 'ambiguous', 'ambiguous']);
  });

  it('each have a finished slide, a JPEG small enough for a phone', () => {
    for (const p of PICTURES) {
      const slide = file(`public/ppdt/${p.id}.jpg`);
      expect(existsSync(slide), p.id).toBe(true);
      const bytes = readFileSync(slide);
      expect(bytes.subarray(0, 3).toString('hex'), p.id).toBe('ffd8ff');
      expect(statSync(slide).size, p.id).toBeLessThan(400_000);
    }
  });

  it('each keep the original they were made from', () => {
    for (const p of PICTURES) expect(existsSync(file(`content/ppdt/source/${p.id}.jpg`)), p.id).toBe(true);
  });

  it('each say where they came from: a licensed photo with its page and photographer, or supplied by the owner', () => {
    for (const p of PICTURES) {
      if (p.source.kind === 'pexels') {
        expect(p.source.url, p.id).toMatch(/^https:\/\/www\.pexels\.com\/photo\/.+-\d+\/$/);
        expect(p.source.photographer.length, p.id).toBeGreaterThan(0);
        expect(p.source.licence).toBe('Pexels License');
      } else {
        expect(p.source.note.length, p.id).toBeGreaterThan(0);
      }
    }
    expect(PICTURES.filter((p) => p.source.kind === 'owner')).toHaveLength(5);
  });

  it('have ground truth that hangs together', () => {
    for (const p of PICTURES) {
      const { min, typical, max } = p.people;
      expect(min <= typical && typical <= max && min >= 1, p.id).toBe(true);
      expect(p.characters.length, p.id).toBeLessThanOrEqual(max);
      expect(p.moods.length, p.id).toBeGreaterThan(0);
      expect(p.action.length, p.id).toBeGreaterThan(10);
    }
  });

  it('are found by id, and nothing else is', () => {
    expect(pictureById('ppdt-03')?.difficulty).toBe('clear');
    expect(pictureById('ppdt-99')).toBeUndefined();
  });
});
