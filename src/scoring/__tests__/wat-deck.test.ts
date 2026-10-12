import { describe, it, expect } from 'vitest';
import { INSTRUMENT_SPECS } from '../thresholds.ts';
import deck from '../../../content/wat-deck-2026-04-28.json' with { type: 'json' };

/**
 * A real WAT stimulus deck, checked against the spec we scored candidates on.
 *
 * `INSTRUMENT_SPECS.wat.items = 60` was derived from the assessor's blank
 * tallies, not from a deck. This is the first independent confirmation that the
 * number is right, and it also pins the 15-second timing that makes WAT a
 * speeded test.
 *
 * The deck's own defects are asserted rather than tidied away. They are real
 * and a candidate meets them; a corrected deck should fail these and be
 * re-examined deliberately.
 */

describe('the deck agrees with our instrument spec', () => {
  it('has the 60 items we score against', () => {
    expect(deck.statedWordCount).toBe(INSTRUMENT_SPECS.wat.items);
    expect(deck.extractedWordCount).toBe(INSTRUMENT_SPECS.wat.items);
  });

  it('confirms 15 seconds per word', () => {
    // ARCHITECTURE.md section 2 states 15s/word for WAT. This is the source.
    expect(deck.statedSecondsPerWord).toBe(15);
  });

  it('numbers its words 1..60 with no gaps', () => {
    expect(deck.missingOrdinals).toEqual([]);
    expect(deck.words.map((w) => w.ordinal)).toEqual(
      Array.from({ length: 60 }, (_, i) => i + 1),
    );
  });

  it('gives every word a non-empty stimulus', () => {
    for (const w of deck.words) expect(w.word.trim().length).toBeGreaterThan(0);
  });
});

describe('known defects in the source deck', () => {
  it('repeats REGULAR at 11 and 45', () => {
    // A duplicate stimulus makes two items non-independent: the second response
    // is primed by the first. Worth knowing before this seeds an item bank.
    expect(deck.duplicates).toEqual([{ word: 'REGULAR', ordinals: [11, 45] }]);
  });

  it('carries the misspelling DIFFCULT at 19', () => {
    expect(deck.words.find((w) => w.ordinal === 19)?.word).toBe('DIFFCULT');
  });

  it('carries the questionable stimulus DAMES at 51', () => {
    expect(deck.words.find((w) => w.ordinal === 51)?.word).toBe('DAMES');
  });
});

describe('the corpus WAT words come from this bank', () => {
  const byWord = new Map(deck.words.map((w) => [w.word, w.ordinal]));

  it('contains every stimulus word transcribed from the graded sheets', () => {
    // 13 of 17 sampled words sit at the SAME ordinal; the other four appear in
    // the deck at a different one. Same bank, small positional drift.
    for (const word of [
      'NAUGHTY', 'JEALOUS', 'RISK', 'FAITH', 'LEADER', 'PRACTICE',
      'CHEATER', 'DIVIDE', 'ATTACK', 'HONESTY', 'SUICIDE',
    ]) {
      expect(byWord.has(word), `${word} should be in the deck`).toBe(true);
    }
  });

  it('places SUICIDE last, which is where every sheet ends', () => {
    expect(byWord.get('SUICIDE')).toBe(60);
  });
});
