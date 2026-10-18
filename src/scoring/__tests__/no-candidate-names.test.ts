import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

/**
 * D21: no candidate name in anything git would commit. Real names live only in
 * the gitignored records, so the check reads them there — and is skipped on a
 * clone that has no records (it has no names to leak, either).
 *
 * Scans bytes, not text, so a name inside a .docx or an image's metadata is
 * caught too. Case-insensitive, so file names like `first-last.json` count.
 */
const RECORDS = 'corpus/records';
const hasGit = existsSync('.git');

function committable(): string[] {
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' });
  // A nested git worktree (an agent's checkout) is listed as a directory: its files are not this repo's to commit.
  return out.split('\n').filter((f) => f && existsSync(f) && statSync(f).isFile());
}

function nameParts(): string[] {
  const parts = new Set<string>();
  for (const file of readdirSync(RECORDS).filter((f) => f.endsWith('.json'))) {
    const name: unknown = JSON.parse(readFileSync(`${RECORDS}/${file}`, 'utf8')).candidate?.name;
    if (typeof name === 'string') for (const p of name.split(/\s+/)) if (p.replace(/\.$/, '').length > 2) parts.add(p.replace(/\.$/, ''));
    parts.add(file.replace(/\.json$/, ''));
  }
  return [...parts];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('privacy (D21)', () => {
  it.skipIf(!existsSync(RECORDS) || !hasGit)('no committable file contains a candidate name (local only)', () => {
    const patterns = nameParts().map((n) => [n, new RegExp(`(?<![A-Za-z])${esc(n)}(?![A-Za-z])`, 'i')] as const);
    const leaks: string[] = [];
    for (const file of committable()) {
      const bytes = readFileSync(file).toString('latin1');
      for (const [name, re] of patterns) if (re.test(bytes)) leaks.push(`${file}: ${name}`);
    }
    expect(leaks).toEqual([]);
    // Reads every committable byte, images included (metadata can carry a name), so it grows with the repo.
  }, 60_000);
});
