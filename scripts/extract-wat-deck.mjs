/**
 * Extracts a WAT stimulus deck (.pptx) into a structured word list.
 *
 *   node scripts/extract-wat-deck.mjs <deck.pptx> <out.json>
 *
 * A WAT deck is one word per slide with its serial number, bracketed by
 * instruction slides and "BLANK SLIDE" page-turn breaks. This pulls the
 * numbered words out and records the timing the instructions state, so the
 * deck can be checked against `INSTRUMENT_SPECS.wat` rather than trusted.
 *
 * Reads the .pptx as a zip — no python, no dependency.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [deckPath, outPath] = process.argv.slice(2);
if (!deckPath || !outPath) {
  console.error('usage: node scripts/extract-wat-deck.mjs <deck.pptx> <out.json>');
  process.exit(1);
}

/** Slide XML in document order. unzip -p keeps it simple and dependency-free. */
function slideTexts(pptx) {
  const list = execFileSync('unzip', ['-Z1', pptx], { encoding: 'utf8' })
    .split('\n')
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));

  return list.map((name) => {
    const xml = execFileSync('unzip', ['-p', pptx, name], { encoding: 'utf8' });
    // <a:t> holds every run of visible text.
    const runs = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((m) =>
      m[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim(),
    );
    return { slide: name, runs: runs.filter(Boolean) };
  });
}

const slides = slideTexts(deckPath);
const words = [];

for (const { runs } of slides) {
  const joined = runs.join(' ').toUpperCase();
  if (/BLANK SLIDE|EXAMPLE|END OF TEST|STAND BY/.test(joined)) continue;

  // A word slide is exactly a serial number and a single word, in either order.
  const num = runs.find((r) => /^\d{1,2}$/.test(r));
  const word = runs.find((r) => /^[A-Za-z][A-Za-z'\- ]{1,20}$/.test(r));
  if (num && word && runs.length <= 3) {
    words.push({ ordinal: Number(num), word: word.toUpperCase().trim() });
  }
}

words.sort((a, b) => a.ordinal - b.ordinal);

// Stated timing, read from the instruction slides rather than assumed.
const instructions = slides
  .map((s) => s.runs.join(' '))
  .join(' ')
  .toUpperCase();
const secondsMatch = instructions.match(/(\d+)\s*SECONDS FOR EACH WORD/);
const countMatch = instructions.match(/SHOWN\s+(\d+)\s+WORDS/);

// Integrity checks — a deck is content, and content has defects.
const seen = new Map();
const duplicates = [];
for (const w of words) {
  if (seen.has(w.word)) duplicates.push({ word: w.word, ordinals: [seen.get(w.word), w.ordinal] });
  else seen.set(w.word, w.ordinal);
}
const expected = countMatch ? Number(countMatch[1]) : words.length;
const gaps = [];
for (let i = 1; i <= expected; i++) if (!words.some((w) => w.ordinal === i)) gaps.push(i);

const out = {
  source: deckPath.split(/[\\/]/).pop(),
  extracted: new Date().toISOString().slice(0, 10),
  statedWordCount: countMatch ? Number(countMatch[1]) : null,
  statedSecondsPerWord: secondsMatch ? Number(secondsMatch[1]) : null,
  extractedWordCount: words.length,
  duplicates,
  missingOrdinals: gaps,
  words,
};

writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');

console.log(`wrote ${outPath}`);
console.log(`  ${words.length} words extracted (deck states ${out.statedWordCount})`);
console.log(`  ${out.statedSecondsPerWord}s per word`);
if (duplicates.length) {
  console.log(`  ** ${duplicates.length} DUPLICATE word(s):`);
  for (const d of duplicates) console.log(`       "${d.word}" at ${d.ordinals.join(' and ')}`);
}
if (gaps.length) console.log(`  ** missing ordinals: ${gaps.join(', ')}`);
