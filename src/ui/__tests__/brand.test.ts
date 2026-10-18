import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND } from '../brand.ts';

/**
 * The product is CadetPrep (cadetprep.in). The name lives in one place; nothing a
 * reader sees may still say the old one. Internal names (repo, Vercel project,
 * `.invalid` test addresses) are not the brand and are left alone.
 */
const ROOTS = ['src/app', 'src/ui'];
// The old name as one word, or split for the wordmark. "Crack SSB" with a space is the tagline.
const OLD = /CrackSSB|Crack<span/i;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : sources(path);
    return /\.(tsx?|css)$/.test(e.name) ? [path] : [];
  });
}

describe('brand', () => {
  it('is CadetPrep, split for the two-tone wordmark', () => {
    expect(BRAND.name).toBe('CadetPrep');
    expect(`${BRAND.lead}${BRAND.accent}`).toBe(BRAND.name);
    expect(BRAND.tagline).toBe('Crack SSB with confidence');
  });

  it('leaves no trace of the old name in anything a reader sees', () => {
    const hits = ROOTS.flatMap(sources).filter((f) => OLD.test(readFileSync(f, 'utf8')));
    expect(hits).toEqual([]);
  });
});
