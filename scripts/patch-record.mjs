/**
 * Merges transcribed TAT stories into an existing corpus record.
 *
 *   node scripts/patch-record.mjs <record.json> <patch.json>
 *
 * The patch is { "<ordinal>": { response_text, confidence?, marks?, observation? } }.
 * Existing items are updated in place and keep any marks already recorded unless
 * the patch supplies its own; new items are inserted in ordinal order.
 *
 * Existing `response_text` is only overwritten when the patch text is longer —
 * a de-abridging pass should never shorten what is already there by accident.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [recordPath, patchPath] = process.argv.slice(2);
if (!recordPath || !patchPath) {
  console.error('usage: node scripts/patch-record.mjs <record.json> <patch.json>');
  process.exit(1);
}

const record = JSON.parse(readFileSync(recordPath, 'utf8'));
const patch = JSON.parse(readFileSync(patchPath, 'utf8'));
const tat = record.instruments?.tat;
if (!tat) throw new Error(`${recordPath} has no instruments.tat`);
tat.items ??= [];

let added = 0;
let updated = 0;

for (const [key, incoming] of Object.entries(patch)) {
  const ordinal = Number(key);
  const existing = tat.items.find((i) => i.ordinal === ordinal);

  if (!existing) {
    tat.items.push({ ordinal, ...incoming });
    added += 1;
    continue;
  }

  const oldText = existing.response_text ?? '';
  const newText = incoming.response_text ?? '';
  if (newText && newText.length >= oldText.length) {
    existing.response_text = newText;
  } else if (newText) {
    console.warn(`  ! story ${ordinal}: patch text is SHORTER than existing — kept existing`);
  }
  if (incoming.confidence) existing.confidence = incoming.confidence;
  if (incoming.observation) existing.observation = incoming.observation;
  if (incoming.marks?.length) {
    // Union by type+raw so re-running is idempotent.
    const seen = new Set((existing.marks ?? []).map((m) => `${m.type}|${m.raw}`));
    existing.marks = [
      ...(existing.marks ?? []),
      ...incoming.marks.filter((m) => !seen.has(`${m.type}|${m.raw}`)),
    ];
  }
  updated += 1;
}

tat.items.sort((a, b) => a.ordinal - b.ordinal);
tat.attempted = tat.items.filter((i) => i.response_text).length;

writeFileSync(recordPath, JSON.stringify(record, null, 2) + '\n');
console.log(`${recordPath}: ${added} added, ${updated} updated, ${tat.items.length} items total`);
