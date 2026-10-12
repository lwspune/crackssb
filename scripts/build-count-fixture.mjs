/**
 * Derives a non-identifying count fixture from the private corpus records.
 *
 * The full records carry real names, family detail and psychological
 * self-disclosure, and are gitignored. This fixture carries only pseudonymous
 * ids and integers, so the replay test can run for anyone who clones the repo.
 *
 * Re-run after editing corpus/records/. Deterministic: candidates are sorted so
 * the pseudonymous ids are stable across runs.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recordsDir = join(root, 'corpus', 'records');
const outFile = join(root, 'src', 'scoring', '__tests__', 'fixtures', 'corpus-counts.json');

const files = readdirSync(recordsDir).filter((f) => f.endsWith('.json')).sort();

const candidates = files.map((file, i) => {
  const d = JSON.parse(readFileSync(join(recordsDir, file), 'utf8'));
  const inst = d.instruments ?? {};
  const row = { id: `cand-${String(i + 1).padStart(2, '0')}` };

  for (const key of ['tat', 'wat', 'srt', 'sdt']) {
    const x = inst[key];
    if (!x) continue;
    const entry = {};
    if (typeof x.attempted === 'number') entry.attempted = x.attempted;
    if (typeof x.blank_count_stated === 'number') entry.blanksStated = x.blank_count_stated;

    // The assessor's own count / threshold marks are the ground truth we replay against.
    const marks = [...(x.summary_marks ?? [])].filter(
      (m) => m.type === 'count' || m.type === 'threshold',
    );
    if (marks.length) entry.assessorMarks = marks.map((m) => m.raw);
    if (Object.keys(entry).length) row[key] = entry;
  }
  return row;
});

const fixture = {
  note:
    'Derived from corpus/records by scripts/build-count-fixture.mjs. ' +
    'Pseudonymous and non-identifying: integers and the assessor’s own count marks only. ' +
    'Do not hand-edit — regenerate instead.',
  source: 'LWS Pune psych dossiers, 11 candidates, assessed 2026-07-31, single assessor',
  candidates,
};

writeFileSync(outFile, JSON.stringify(fixture, null, 2) + '\n');
console.log(`wrote ${outFile}`);
console.log(`${candidates.length} candidates`);
for (const c of candidates) {
  const srt = c.srt?.attempted ?? '--';
  const wat = c.wat?.attempted ?? '--';
  console.log(`  ${c.id}  srt=${String(srt).padStart(2)}  wat=${String(wat).padStart(2)}`);
}
