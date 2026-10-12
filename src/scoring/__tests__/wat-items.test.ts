import { describe, it, expect } from 'vitest';
import { INSTRUMENT_SPECS } from '../thresholds.ts';
import bank from '../../../content/wat-items.json' with { type: 'json' };
import deck from '../../../content/wat-deck-2026-04-28.json' with { type: 'json' };

/**
 * The seeded WAT item bank.
 *
 * Derived from the 28-04-26 deck with three deliberate substitutions, built by
 * `scripts/build-wat-items.mjs` so the transformation is auditable rather than
 * hand-typed. These tests hold the properties the source deck failed.
 */

describe('shape', () => {
  it('is a full instrument', () => {
    expect(bank.assessment_type).toBe('wat');
    expect(bank.items).toHaveLength(INSTRUMENT_SPECS.wat.items);
  });

  it('numbers 1..60 with no gaps', () => {
    expect(bank.items.map((i) => i.ordinal)).toEqual(
      Array.from({ length: 60 }, (_, n) => n + 1),
    );
  });

  it('gives every item a payload word, a difficulty and a source', () => {
    for (const item of bank.items) {
      expect(item.payload.word).toMatch(/^[A-Z]+$/);
      expect([1, 2, 3]).toContain(item.difficulty);
      expect(item.source).toBeTruthy();
      expect(item.active).toBe(true);
    }
  });
});

describe('the three defects are fixed', () => {
  it('has NO duplicate stimulus — the whole point', () => {
    const words = bank.items.map((i) => i.payload.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it('spells DIFFICULT correctly at 19', () => {
    expect(bank.items.find((i) => i.ordinal === 19)?.payload.word).toBe('DIFFICULT');
    expect(deck.words.find((w) => w.ordinal === 19)?.word).toBe('DIFFCULT'); // source was wrong
  });

  it('no longer carries DAMES', () => {
    expect(bank.items.some((i) => i.payload.word === 'DAMES')).toBe(false);
  });

  it('keeps REGULAR once, at its first position', () => {
    const regular = bank.items.filter((i) => i.payload.word === 'REGULAR');
    expect(regular).toHaveLength(1);
    expect(regular[0].ordinal).toBe(11);
  });
});

describe('every change is recorded, and nothing else changed', () => {
  it('marks exactly three items as substituted', () => {
    expect(bank.items.filter((i) => i.substitution)).toHaveLength(3);
  });

  it('records what each substitution replaced and why', () => {
    for (const item of bank.items.filter((i) => i.substitution)) {
      expect(item.substitution!.replaced).toMatch(/^[A-Z]+$/);
      expect(item.substitution!.reason.length).toBeGreaterThan(20);
    }
  });

  it('leaves the other 57 words exactly as the deck had them', () => {
    const bySource = new Map(deck.words.map((w) => [w.ordinal, w.word]));
    for (const item of bank.items) {
      if (item.substitution) continue;
      expect(item.payload.word, `ordinal ${item.ordinal}`).toBe(bySource.get(item.ordinal));
    }
  });
});

describe('valence, which is what difficulty means for WAT', () => {
  it('classifies every item', () => {
    for (const item of bank.items) {
      expect(['neutral', 'mild', 'loaded']).toContain(item.payload.valence);
    }
  });

  it('ties difficulty to valence consistently', () => {
    const rank = { neutral: 1, mild: 2, loaded: 3 } as const;
    for (const item of bank.items) {
      expect(item.difficulty).toBe(rank[item.payload.valence as keyof typeof rank]);
    }
  });

  it('marks the words the corpus shows candidates being penalised over', () => {
    // TEMPER and MONEY both surface as assessor trait flags on real sheets
    // ("Short temper", "Money-Minded"), so they are not neutral prompts.
    for (const word of ['SUICIDE', 'TEMPER', 'MONEY', 'ENEMY', 'DESTROY']) {
      const item = bank.items.find((i) => i.payload.word === word);
      expect(item?.payload.valence, word).not.toBe('neutral');
    }
  });

  it('keeps loaded words a minority — a bank of them would not discriminate', () => {
    const loaded = bank.items.filter((i) => i.payload.valence === 'loaded').length;
    expect(loaded).toBeGreaterThan(10);
    expect(loaded / bank.items.length).toBeLessThan(0.5);
  });
});
