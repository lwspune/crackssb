/**
 * Strips the ground truth out of the eval set.
 *
 * An in-session judge (or any human grader) must not see the assessor's marks
 * while grading. This writes the story text and slide number only; the scorer
 * rejoins the expected grades afterwards by id.
 *
 * Gitignored: contains candidate writing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(root, 'corpus', 'eval-set.json'), 'utf8'));

const blind = src.pairs.map((p) => ({
  id: p.id,
  slide: p.slide,
  responseText: p.responseText,
}));

const out = join(root, 'corpus', 'blind-set.json');
writeFileSync(
  out,
  JSON.stringify(
    {
      note: 'Ground truth REMOVED. Grade from this file only. Regenerate with `npm run blindset`.',
      count: blind.length,
      stories: blind,
    },
    null,
    2,
  ) + '\n',
);
console.log(`wrote ${out}\n  ${blind.length} stories, no grades attached`);
