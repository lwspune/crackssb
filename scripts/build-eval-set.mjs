/**
 * Extracts the paired eval set from the private corpus records.
 *
 * A pair is one TAT story that has BOTH the candidate's verbatim text (the
 * model's input) and the assessor's marks (the ground truth). Stories with
 * marks but no text cannot be scored and are excluded.
 *
 * Output contains candidate writing, so it is gitignored alongside records/.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recordsDir = join(root, 'corpus', 'records');
const outFile = join(root, 'corpus', 'eval-set.json');

const GRADE_PATTERNS = [
  [/v\.?\s*good/i, 'V. good'],
  [/\bgood\b/i, 'Good'],
  [/just\s*\/?\s*avg/i, 'Just Avg'],
  [/\bavg\b/i, 'AVG'],
  [/\blow\b/i, 'LOW'],
];

/** Map the assessor's free-text verdicts onto his own closed grade vocabulary. */
function gradeFrom(marks) {
  const verdicts = marks.filter((m) => m.type === 'verdict').map((m) => m.raw);
  for (const raw of verdicts) {
    for (const [re, grade] of GRADE_PATTERNS) {
      if (re.test(raw)) return { grade, source: raw };
    }
  }
  return { grade: null, source: null };
}

const pairs = [];
const files = readdirSync(recordsDir).filter((f) => f.endsWith('.json')).sort();

files.forEach((file, ci) => {
  const d = JSON.parse(readFileSync(join(recordsDir, file), 'utf8'));
  const id = `cand-${String(ci + 1).padStart(2, '0')}`;
  const tat = d.instruments?.tat;
  if (!tat?.items) return;

  for (const item of tat.items) {
    const text = item.response_text;
    if (!text || !text.trim()) continue;
    const marks = item.marks ?? [];
    const { grade, source } = gradeFrom(marks);
    const markRaw = marks.find((m) => m.type === 'mark_raw')?.raw ?? null;

    pairs.push({
      id: `${id}-tat-${item.ordinal}`,
      candidate: id,
      slide: item.ordinal,
      responseText: text,
      // The candidate stopped mid-sentence. Faithful to the sheet, so it is
      // scorable — the assessor marked it incomplete and so should a judge.
      truncatedByCandidate: Boolean(item.truncated_by_candidate),
      expected: {
        grade,
        gradeSource: source,
        markRaw,
        accepted: markRaw ? (markRaw.includes('v') ? true : markRaw.includes('x') ? false : null) : null,
        olqCodes: marks.filter((m) => m.type === 'olq_code').map((m) => m.raw),
        traits: marks.filter((m) => m.type === 'trait').map((m) => m.raw),
        themeFlags: marks.filter((m) => m.type === 'theme_flag').map((m) => m.raw),
        perceptionMismatch: marks.find((m) => m.type === 'perception_flag')?.raw ?? null,
      },
    });
  }
});

const graded = pairs.filter((p) => p.expected.grade);
const withMark = pairs.filter((p) => p.expected.accepted !== null);

writeFileSync(
  outFile,
  JSON.stringify(
    {
      note:
        'Paired eval set derived from corpus/records by scripts/build-eval-set.mjs. ' +
        'CONTAINS CANDIDATE WRITING - gitignored. Do not hand-edit; regenerate.',
      source: 'LWS Pune psych dossiers, 11 candidates, assessed 2026-07-31, single assessor',
      generated: new Date().toISOString().slice(0, 10),
      counts: { pairs: pairs.length, withGrade: graded.length, withTickCross: withMark.length },
      pairs,
    },
    null,
    2,
  ) + '\n',
);

console.log(`wrote ${outFile}`);
console.log(`  ${pairs.length} paired stories`);
console.log(`  ${graded.length} carry a grade on the assessor's closed vocabulary`);
console.log(`  ${withMark.length} carry a tick/cross`);
const trunc = pairs.filter((p) => p.truncatedByCandidate).length;
console.log(`  ${trunc} end mid-sentence because the candidate stopped (scorable)`);

const bySlide = {};
for (const p of pairs) bySlide[p.slide] = (bySlide[p.slide] ?? 0) + 1;
console.log('\n  per slide: ' + Object.entries(bySlide).map(([s, n]) => `${s}:${n}`).join('  '));

const byGrade = {};
for (const p of graded) byGrade[p.expected.grade] = (byGrade[p.expected.grade] ?? 0) + 1;
console.log('  grades:    ' + Object.entries(byGrade).map(([g, n]) => `${g}:${n}`).join('  '));
