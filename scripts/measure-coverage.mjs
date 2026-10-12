/**
 * How much of the human assessor's marking is reproducible without a model?
 *
 * Classifies every typed mark in the corpus into the layer that can produce it.
 * This is the number DECISIONS.md D10 says to measure before selecting an LLM
 * provider: it bounds how much work the judgement layer actually has to do.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const recordsDir = join(root, 'corpus', 'records');

/** Which layer can produce each mark type, and is it built yet? */
const CLASSIFICATION = {
  count:                { layer: 1, built: true,  why: 'arithmetic over attempted/blank responses' },
  threshold:            { layer: 1, built: true,  why: 'fixed stated target (45+ SRT, 80-90 words)' },
  correction_style:     { layer: 2, built: true,  why: 'regex: must/should, try/tried, WAT pronouns' },
  correction_spelling:  { layer: 2, built: false, why: 'needs a dictionary dependency - not yet chosen' },
  correction_grammar:   { layer: 2, built: false, why: 'pronoun-gender agreement needs light NLP' },
  verdict:              { layer: 3, built: false, why: 'quality judgement' },
  olq_code:             { layer: 3, built: false, why: 'OLQ inference' },
  trait:                { layer: 3, built: false, why: 'trait inference' },
  theme_flag:           { layer: 3, built: false, why: 'theme acceptability' },
  perception_flag:      { layer: 3, built: false, why: 'requires the stimulus' },
  instruction:          { layer: 3, built: false, why: 'free-form coaching prose' },
  mark_raw:             { layer: 0, built: false, why: 'notation undecoded - open question for LWS' },
  stimulus_description: { layer: 0, built: false, why: 'assessor describing the slide, not grading' },
};

const counts = new Map();
function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (node && typeof node === 'object') {
    if (typeof node.type === 'string' && 'raw' in node) {
      counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
    }
    Object.values(node).forEach(walk);
  }
}

for (const f of readdirSync(recordsDir).filter((f) => f.endsWith('.json'))) {
  walk(JSON.parse(readFileSync(join(recordsDir, f), 'utf8')));
}

const total = [...counts.values()].reduce((a, b) => a + b, 0);
const bucket = { builtDeterministic: 0, deterministicCeiling: 0, needsModel: 0, unclassified: 0 };
const rows = [];

for (const [type, n] of [...counts].sort((a, b) => b[1] - a[1])) {
  const c = CLASSIFICATION[type] ?? { layer: 0, built: false, why: 'UNCLASSIFIED' };
  rows.push({ type, n, ...c });
  if (c.layer === 1 || c.layer === 2) {
    bucket.deterministicCeiling += n;
    if (c.built) bucket.builtDeterministic += n;
  } else if (c.layer === 3) bucket.needsModel += n;
  else bucket.unclassified += n;
}

const pct = (n) => `${((100 * n) / total).toFixed(1)}%`;

console.log(`\nCorpus: ${total} typed assessor marks across 11 sheets\n`);
console.log('  marks  layer  built  type                  rationale');
console.log('  '.padEnd(80, '-'));
for (const r of rows) {
  console.log(
    `  ${String(r.n).padStart(5)}  ${r.layer === 0 ? ' - ' : `  ${r.layer}`}    ` +
      `${r.built ? ' yes ' : ' no  '}  ${r.type.padEnd(21)} ${r.why}`,
  );
}

console.log('\n' + '='.repeat(72));
console.log(`  Reproducible by code shipped today   ${String(bucket.builtDeterministic).padStart(4)}  ${pct(bucket.builtDeterministic)}`);
console.log(`  Deterministic ceiling (L1+L2 whole)  ${String(bucket.deterministicCeiling).padStart(4)}  ${pct(bucket.deterministicCeiling)}`);
console.log(`  Requires the judgement layer         ${String(bucket.needsModel).padStart(4)}  ${pct(bucket.needsModel)}`);
console.log(`  Undecoded / not a grading mark       ${String(bucket.unclassified).padStart(4)}  ${pct(bucket.unclassified)}`);
console.log('='.repeat(72));

console.log(
  '\nCaveat: this counts MARKS, not weight. One "Only 16 SRT" count carries far more\n' +
    'consequence for a candidate than one spelling correction, and the corpus gives no\n' +
    'way to weight them. Treat as an upper bound on effort saved, not on value.\n',
);
