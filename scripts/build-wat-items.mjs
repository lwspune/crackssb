/**
 * Builds the seeded WAT item bank from an extracted stimulus deck.
 *
 *   node scripts/build-wat-items.mjs
 *
 * The source deck has three defects (see content/README.md). Rather than hand
 * -editing the word list, every change is declared here so the diff between
 * source and bank is one readable table, and the other 57 words are provably
 * untouched.
 *
 * Output shape follows `items` in ARCHITECTURE.md section 4:
 * assessment_type, difficulty, payload jsonb, active, source.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = 'wat-deck-2026-04-28';
const deck = JSON.parse(readFileSync(join(root, 'content', `${SOURCE}.json`), 'utf8'));

/** Every deliberate change, keyed by ordinal. Nothing else is altered. */
const SUBSTITUTIONS = {
  19: {
    word: 'DIFFICULT',
    replaced: 'DIFFCULT',
    reason:
      'Spelling fix. Candidates are marked on their own spelling — several graded sheets carry spelling corrections — so showing them a misspelt stimulus is unfair.',
  },
  45: {
    word: 'DISCIPLINE',
    replaced: 'REGULAR',
    reason:
      'REGULAR appeared at both 11 and 45, so the two items were not independent — the second response is primed by the first. Kept at 11, replaced here with a word in the same habit-and-routine register.',
  },
  51: {
    word: 'RIVAL',
    replaced: 'DAMES',
    reason:
      'DAMES is archaic and gendered, and the deck is used for a mixed cohort (its own title slide reads FOR MALE & FEMALE). RIVAL keeps the competitive/hostile register of the surrounding words without the problem.',
  },
};

/**
 * Valence — what "difficulty" means for a word association test.
 *
 * A neutral word (TABLE) is easy to answer constructively; a loaded one
 * (SUICIDE) tests whether the candidate stays positive and impersonal under a
 * hostile prompt. The corpus supports this directly: TEMPER and MONEY both
 * surface as assessor trait flags ("Short temper", "Money-Minded"), so they are
 * not neutral prompts whatever a dictionary says.
 */
const LOADED = new Set([
  'JEALOUS', 'IGNORE', 'POLLUTION', 'RESTRICT', 'SHY', 'CHEATER', 'CRIMINAL',
  'CONFLICT', 'MONSTER', 'DESTROY', 'GREED', 'VILLAIN', 'CORRUPT', 'ENEMY',
  'TEMPER', 'ATTACK', 'FOOL', 'DISTURBED', 'SUICIDE',
]);

const MILD = new Set([
  'NAUGHTY', 'RISK', 'MONEY', 'CHALLENGE', 'DIFFICULT', 'DIVIDE', 'JOKER',
  'PROBLEM', 'CANCEL', 'EXCUSE', 'RIVAL', 'PAST',
]);

const valenceOf = (word) => (LOADED.has(word) ? 'loaded' : MILD.has(word) ? 'mild' : 'neutral');
const DIFFICULTY = { neutral: 1, mild: 2, loaded: 3 };

const items = deck.words.map(({ ordinal, word }) => {
  const sub = SUBSTITUTIONS[ordinal];
  const finalWord = sub ? sub.word : word;
  const valence = valenceOf(finalWord);

  return {
    ordinal,
    assessment_type: 'wat',
    payload: { word: finalWord, valence },
    difficulty: DIFFICULTY[valence],
    active: true,
    source: SOURCE,
    ...(sub ? { substitution: { replaced: sub.replaced, reason: sub.reason } } : {}),
  };
});

// Refuse to emit a bank with the defect it exists to fix.
const words = items.map((i) => i.payload.word);
const dupes = words.filter((w, i) => words.indexOf(w) !== i);
if (dupes.length) {
  console.error(`Refusing to write: duplicate stimulus ${[...new Set(dupes)].join(', ')}`);
  process.exit(1);
}

const counts = { neutral: 0, mild: 0, loaded: 0 };
for (const i of items) counts[i.payload.valence] += 1;

const out = {
  assessment_type: 'wat',
  generated: new Date().toISOString().slice(0, 10),
  source: SOURCE,
  itemCount: items.length,
  secondsPerItem: deck.statedSecondsPerWord,
  valenceCounts: counts,
  substitutionCount: Object.keys(SUBSTITUTIONS).length,
  items,
};

const outPath = join(root, 'content', 'wat-items.json');
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

console.log(`wrote ${outPath}`);
console.log(`  ${items.length} items, ${out.secondsPerItem}s each, no duplicates`);
console.log(`  valence: ${counts.neutral} neutral / ${counts.mild} mild / ${counts.loaded} loaded`);
console.log(`  substitutions:`);
for (const [ord, s] of Object.entries(SUBSTITUTIONS)) {
  console.log(`    ${String(ord).padStart(2)}  ${s.replaced} -> ${s.word}`);
}
