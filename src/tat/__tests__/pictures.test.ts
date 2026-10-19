import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { PICTURES, pictureById } from '../pictures.ts';

/**
 * The TAT pictures (D36): twenty-three line drawings the owner chose from two
 * practice sites, each with what a careful look shows, where it came from, and
 * how it was made into a slide.
 */
const root = new URL('../../../', import.meta.url);
const file = (p: string) => new URL(p, root);

describe('the TAT pictures', () => {
  it('are twenty-three, numbered in order', () => {
    expect(PICTURES.map((p) => p.id)).toEqual(Array.from({ length: 23 }, (_, i) => `tat-${String(i + 1).padStart(2, '0')}`));
  });

  it('each have a finished slide, a JPEG small enough for a phone', () => {
    for (const p of PICTURES) {
      const slide = file(`public/tat/${p.id}.jpg`);
      expect(existsSync(slide), p.id).toBe(true);
      expect(readFileSync(slide).subarray(0, 3).toString('hex'), p.id).toBe('ffd8ff');
      expect(statSync(slide).size, p.id).toBeLessThan(400_000);
    }
  });

  it('each keep the original they were made from, as downloaded', () => {
    for (const p of PICTURES) expect(existsSync(file(`content/tat/source/${p.id}.png`)), p.id).toBe(true);
  });

  it('each say where they came from: the page, and that the owner chose it', () => {
    for (const p of PICTURES) {
      expect(p.source.kind, p.id).toBe('owner');
      expect(p.source.url, p.id).toMatch(/^https:\/\/(www\.adda247\.com|ssbcrackexams\.com)\//);
      expect(p.source.note, p.id).toMatch(/^Chosen by the owner from (adda247\.com|ssbcrackexams\.com) .+, 2026-10-19\.$/);
    }
  });

  it('have ground truth that hangs together: what it shows, and who is in it', () => {
    for (const p of PICTURES) {
      const { min, typical, max } = p.people;
      expect(min <= typical && typical <= max && min >= 1, p.id).toBe(true);
      expect(p.shows.length, p.id).toBeGreaterThanOrEqual(60);
      expect(p.title.length, p.id).toBeLessThanOrEqual(40);
    }
  });

  it('crop inside the original', () => {
    for (const p of PICTURES) {
      const [x, y, w, h] = p.processing.crop;
      expect(x >= 0 && y >= 0 && w > 200 && h > 150, p.id).toBe(true);
    }
  });

  it('are found by id, and nothing else is', () => {
    expect(pictureById('tat-14')?.title).toBe('A notice board and a bell');
    expect(pictureById('tat-99')).toBeUndefined();
  });
});
