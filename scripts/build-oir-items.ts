/**
 * Builds the OIR item bank from verbatim book transcriptions and their
 * derived keys.
 *
 *   npm run oiritems
 *
 * Inputs, per chapter:
 *   content/oir/<book>/<chapter>.source.json   the page as printed, never edited
 *   src/items/oir/<book>-<chapter>.ts          the key: answer, rule, confidence,
 *                                              and every deviation from the print
 *
 * Output: content/oir-items.json, the `items` shape of ARCHITECTURE.md §4 with
 * the key still in the payload (as src/items/bank.ts defines it). The seed
 * script splits the key out before anything reaches the database.
 *
 * Held questions (the print cannot be answered as it stands) are listed in the
 * output with their reason and are never written as items.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateItem } from '../src/items/bank.ts';
import { AGRAWAL_CH03_CODING_DECODING } from '../src/items/oir/agrawal-ch03-coding-decoding.ts';
import { AGRAWAL_CH04_WORD_FORMATION } from '../src/items/oir/agrawal-ch04-word-formation.ts';
import { AGRAWAL_CH05_LOGICAL_SEQUENCE } from '../src/items/oir/agrawal-ch05-logical-sequence.ts';
import { AGRAWAL_CH06_SEQUENCE_TEST } from '../src/items/oir/agrawal-ch06-sequence-test.ts';
import { AGRAWAL_CH07_BLOOD_RELATION } from '../src/items/oir/agrawal-ch07-blood-relation.ts';
import { AGRAWAL_CH08_DIRECTIONS } from '../src/items/oir/agrawal-ch08-directions.ts';
import { AGRAWAL_CH09_RANKING } from '../src/items/oir/agrawal-ch09-ranking.ts';
import { AGRAWAL_CH11_SERIES } from '../src/items/oir/agrawal-ch11-series.ts';
import { isHeld } from '../src/items/oir/key.ts';
import type { KeyEntry } from '../src/items/oir/key.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

interface SourceFile {
  source: string;
  chapter: number;
  title: string;
  pages: [number, number];
  /** `text: null` when the chapter prints no direction; its questions then carry none. */
  directions: { section: string; text: string | null }[];
  questions: { n: number; page: number; section: string; stem: string; options: Record<'A' | 'B' | 'C' | 'D', string> }[];
}

/** One row per chapter ingested. `idPrefix` is permanent: an id, once seeded, never changes. */
const CHAPTERS: { file: string; key: Readonly<Record<number, KeyEntry>>; reasoningType: string; idPrefix: string }[] = [
  { file: 'content/oir/agrawal-examcart/ch03-coding-decoding.source.json', key: AGRAWAL_CH03_CODING_DECODING, reasoningType: 'coding', idPrefix: 'oir-agx-ch03' },
  { file: 'content/oir/agrawal-examcart/ch04-word-formation.source.json', key: AGRAWAL_CH04_WORD_FORMATION, reasoningType: 'word_formation', idPrefix: 'oir-agx-ch04' },
  { file: 'content/oir/agrawal-examcart/ch05-logical-sequence.source.json', key: AGRAWAL_CH05_LOGICAL_SEQUENCE, reasoningType: 'word_order', idPrefix: 'oir-agx-ch05' },
  { file: 'content/oir/agrawal-examcart/ch06-sequence-test.source.json', key: AGRAWAL_CH06_SEQUENCE_TEST, reasoningType: 'alphabet', idPrefix: 'oir-agx-ch06' },
  { file: 'content/oir/agrawal-examcart/ch07-blood-relation.source.json', key: AGRAWAL_CH07_BLOOD_RELATION, reasoningType: 'blood_relation', idPrefix: 'oir-agx-ch07' },
  { file: 'content/oir/agrawal-examcart/ch08-directions.source.json', key: AGRAWAL_CH08_DIRECTIONS, reasoningType: 'directions', idPrefix: 'oir-agx-ch08' },
  { file: 'content/oir/agrawal-examcart/ch09-ranking.source.json', key: AGRAWAL_CH09_RANKING, reasoningType: 'ranking', idPrefix: 'oir-agx-ch09' },
  { file: 'content/oir/agrawal-examcart/ch11-series.source.json', key: AGRAWAL_CH11_SERIES, reasoningType: 'series', idPrefix: 'oir-agx-ch11' },
];

/** No measurement exists yet; 3 is the declared "unrated" midpoint until item stats say otherwise (D19). */
const UNRATED_DIFFICULTY = 3;

const items: Record<string, unknown>[] = [];
const held: Record<string, unknown>[] = [];
const sources: Record<string, unknown>[] = [];

for (const chapter of CHAPTERS) {
  const src = JSON.parse(readFileSync(join(root, chapter.file), 'utf8')) as SourceFile;
  sources.push({ source: src.source, chapter: src.chapter, title: src.title, pages: src.pages, file: chapter.file });

  const keyed = new Set(Object.keys(chapter.key).map(Number));
  const printed = new Set(src.questions.map((q) => q.n));
  const missing = [...printed].filter((n) => !keyed.has(n));
  const extra = [...keyed].filter((n) => !printed.has(n));
  if (missing.length || extra.length) {
    console.error(`${chapter.file}: key and source disagree. Unkeyed: ${missing.join(', ') || 'none'}. Not printed: ${extra.join(', ') || 'none'}.`);
    process.exit(1);
  }

  for (const q of src.questions) {
    const entry = chapter.key[q.n];
    const sourceRef = `ch${src.chapter} p${q.page} q${q.n}`;
    if (isHeld(entry)) {
      held.push({ source: src.source, source_ref: sourceRef, reason: entry.reason, ...(entry.lean ? { lean: entry.lean } : {}) });
      continue;
    }
    const section = src.directions.find((d) => d.section === q.section);
    if (!section) {
      console.error(`${sourceRef}: no direction for section ${q.section}`);
      process.exit(1);
    }
    const direction = entry.direction ?? section.text;
    const item = {
      id: `${chapter.idPrefix}-q${String(q.n).padStart(3, '0')}`,
      assessment_type: 'oir_verbal',
      payload: { stem: entry.stemFix ?? q.stem, options: q.options, key: entry.key, reasoningType: chapter.reasoningType, ...(direction ? { direction } : {}) },
      difficulty: UNRATED_DIFFICULTY,
      active: true,
      source: src.source,
      source_ref: sourceRef,
      key_basis: 'derived',
      rule: entry.rule,
      confidence: entry.confidence,
      ...(entry.note ? { note: entry.note } : {}),
      ...(entry.stemFix ? { printedStem: q.stem } : {}),
    };
    validateItem(item); // throws, naming the field, on anything malformed
    items.push(item);
  }
}

const ids = items.map((i) => i.id as string);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) {
  console.error(`Refusing to write: duplicate ids ${[...new Set(dupes)].join(', ')}`);
  process.exit(1);
}

const count = (k: string) => items.filter((i) => i.confidence === k).length;
const out = {
  generated: new Date().toISOString().slice(0, 10),
  sources,
  itemCount: items.length,
  heldCount: held.length,
  confidence: { high: count('high'), medium: count('medium') },
  held,
  items,
};

const outPath = join(root, 'content', 'oir-items.json');
writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

console.log(`wrote ${outPath}`);
console.log(`  ${items.length} items (${out.confidence.high} high, ${out.confidence.medium} medium), ${held.length} held`);
for (const h of held) console.log(`    held ${h.source_ref}: ${h.reason}`);
