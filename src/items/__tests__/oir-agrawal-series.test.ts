import { describe, it, expect } from 'vitest';
import source from '../../../content/oir/agrawal-examcart/ch11-series.source.json' with { type: 'json' };
import bank from '../../../content/oir-items.json' with { type: 'json' };
import { OPTION_LABELS, validateItem } from '../bank.ts';
import type { OptionLabel } from '../bank.ts';
import { AGRAWAL_CH11_SERIES as KEY } from '../oir/agrawal-ch11-series.ts';
import { fillBlanks, hamming, minimalPeriod, normalizeLetters, optionLetters, parseNumbers } from '../oir/check.ts';
import { isHeld } from '../oir/key.ts';
import { bankToRows } from '../oir/seed.ts';
import type { KeyedEntry } from '../oir/key.ts';

/**
 * Agrawal ExamCart OIR, Chapter 11 (Series): the transcription, the derived
 * key, and the bank built from them.
 *
 * The key was worked out by hand; this file is what keeps it honest. Every
 * rule that can be run is run against the printed question AND against the
 * three options that were not keyed — a key is only accepted when its rule
 * fits the print and no other option fits the same rule.
 */

type Question = (typeof source.questions)[number];
const questions = source.questions;
const keyed = questions.filter((q) => !isHeld(KEY[q.n])).map((q) => ({ q, k: KEY[q.n] as KeyedEntry }));

const EPS = 1e-9;
const same = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < EPS);

describe('the transcription', () => {
  it('holds questions 1-125 in order, each with four options', () => {
    expect(questions.map((q) => q.n)).toEqual(Array.from({ length: 125 }, (_, i) => i + 1));
    for (const q of questions) {
      for (const label of OPTION_LABELS) expect(q.options[label], `Q${q.n} ${label}`).toBeTruthy();
    }
  });

  it('files each question under the type it actually sits in (the printed ranges overlap)', () => {
    const range = (s: string) => questions.filter((q) => q.section === s).map((q) => q.n);
    expect(range('Type-1')).toEqual(Array.from({ length: 51 }, (_, i) => i + 1));
    expect(range('Type-2')).toEqual(Array.from({ length: 23 }, (_, i) => i + 52));
    expect(range('Type-3')).toEqual(Array.from({ length: 51 }, (_, i) => i + 75));
  });

  it('keeps every question on pages 41-44', () => {
    for (const q of questions) {
      expect(q.page).toBeGreaterThanOrEqual(41);
      expect(q.page).toBeLessThanOrEqual(44);
    }
  });
});

describe('the key', () => {
  it('covers every question exactly once', () => {
    expect(Object.keys(KEY).map(Number).sort((a, b) => a - b)).toEqual(questions.map((q) => q.n));
  });

  it('holds back exactly these seven, each with a reason', () => {
    const held = questions.filter((q) => isHeld(KEY[q.n])).map((q) => q.n);
    expect(held).toEqual([68, 69, 71, 78, 93, 102, 123]);
    for (const n of held) expect((KEY[n] as { reason: string }).reason.length).toBeGreaterThan(20);
  });

  it('gives every keyed answer a rule, and a note wherever confidence is not high or the stem was changed', () => {
    for (const { q, k } of keyed) {
      expect(OPTION_LABELS, `Q${q.n}`).toContain(k.key);
      expect(k.rule.length, `Q${q.n} rule`).toBeGreaterThan(5);
      if (k.confidence !== 'high' || k.stemFix) expect(k.note, `Q${q.n} note`).toBeTruthy();
    }
  });
});

const stemOf = (q: Question, k: KeyedEntry) => k.stemFix ?? q.stem;
const others = (key: OptionLabel) => OPTION_LABELS.filter((l) => l !== key);

describe('every runnable rule fits the print, and only the keyed option fits it', () => {
  const byKind = (kind: string) => keyed.filter(({ k }) => k.check.kind === kind).map(({ q, k }) => [q.n, q, k] as const);

  it.each(byKind('missing'))('Q%i: missing number', (_n, q, k) => {
    if (k.check.kind !== 'missing') throw new Error('unreachable');
    const { terms, blanks } = k.check;
    const printed = terms.filter((_, i) => !blanks.includes(i));
    expect(parseNumbers(stemOf(q, k)), 'printed terms').toEqual(printed);
    const answer = blanks.map((i) => terms[i]);
    expect(same(parseNumbers(q.options[k.key]), answer), `keyed option is ${answer}`).toBe(true);
    for (const l of others(k.key)) expect(same(parseNumbers(q.options[l]), answer), `option ${l} also fits`).toBe(false);
  });

  it.each(byKind('wrong'))('Q%i: wrong number', (_n, q, k) => {
    if (k.check.kind !== 'wrong') throw new Error('unreachable');
    const printed = parseNumbers(q.stem);
    const { terms } = k.check;
    expect(printed.length).toBe(terms.length);
    const diff = printed.map((x, i) => i).filter((i) => Math.abs(printed[i] - terms[i]) > EPS);
    expect(diff, 'exactly one printed term breaks the rule').toHaveLength(1);
    const wrong = printed[diff[0]];
    expect(parseNumbers(q.options[k.key])).toEqual([wrong]);
    for (const l of others(k.key)) expect(parseNumbers(q.options[l])).not.toEqual([wrong]);
  });

  it.each(byKind('fill'))('Q%i: letter series', (_n, q, k) => {
    const check = k.check;
    if (check.kind !== 'fill') throw new Error('unreachable');
    const { template, misread = 0 } = check;
    expect(hamming(normalizeLetters(q.stem), template), 'template matches the print').toBe(misread);
    const fits = (label: OptionLabel) => {
      const filled = fillBlanks(template, optionLetters(q.options[label]));
      return 'period' in check ? minimalPeriod(filled) === check.period : filled === check.expected;
    };
    expect(fits(k.key), 'keyed option completes the pattern').toBe(true);
    for (const l of others(k.key)) {
      // An option with the wrong number of letters cannot fill the blanks at all.
      let ok = false;
      try {
        ok = fits(l);
      } catch {
        ok = false;
      }
      expect(ok, `option ${l} also completes it`).toBe(false);
    }
  });

  it.each(byKind('next'))('Q%i: next item', (_n, q, k) => {
    if (k.check.kind !== 'next') throw new Error('unreachable');
    const { sequence } = k.check;
    const printed = q.stem.split(',').map((s) => s.trim()).filter((s) => /^[A-Za-z]+$/.test(s));
    expect(printed).toEqual(sequence.slice(0, -1));
    const next = sequence[sequence.length - 1];
    expect(optionLetters(q.options[k.key])).toBe(next);
    for (const l of others(k.key)) expect(optionLetters(q.options[l])).not.toBe(next);
  });

  it('leaves only Q51 to reasoning alone', () => {
    expect(keyed.filter(({ k }) => k.check.kind === 'reasoned').map(({ q }) => q.n)).toEqual([51]);
  });
});

describe('the bank built from them (content/oir-items.json)', () => {
  const series = bank.items.filter((i) => i.source === source.source && i.source_ref.startsWith('ch11 '));

  it('holds every keyed question and none of the held ones', () => {
    expect(series).toHaveLength(keyed.length);
    expect(series.map((i) => i.id)).toEqual(keyed.map(({ q }) => `oir-agx-ch11-q${String(q.n).padStart(3, '0')}`));
  });

  it('passes the bank validator', () => {
    for (const item of series) expect(() => validateItem(item)).not.toThrow();
  });

  it('carries the derived key, the printed stem (or its declared fix) and the options verbatim', () => {
    for (const { q, k } of keyed) {
      const item = series.find((i) => i.id.endsWith(`q${String(q.n).padStart(3, '0')}`))!;
      expect(item.payload.key).toBe(k.key);
      expect(item.payload.stem).toBe(stemOf(q, k));
      expect(item.payload.options).toEqual(q.options);
      expect(item.payload.reasoningType).toBe('series');
      expect(item.key_basis).toBe('derived');
      expect(item.rule).toBe(k.rule);
      expect(item.source_ref).toBe(`ch11 p${q.page} q${q.n}`);
    }
  });

  it('records the direction with each item, so a stem like "18, 36, 109" is not shown without its question', () => {
    for (const { q, k } of keyed) {
      const item = series.find((i) => i.id.endsWith(`q${String(q.n).padStart(3, '0')}`))!;
      const printed = source.directions.find((d) => d.section === q.section)!.text;
      expect(item.payload.direction, `Q${q.n}`).toBe(k.direction ?? printed);
    }
  });

  it('splits into database rows with every key moved out of the readable payload', () => {
    const { items, keys } = bankToRows(bank);
    expect(items).toHaveLength(bank.items.length);
    expect(keys).toHaveLength(bank.items.length);
    for (const row of items) expect(row.payload).not.toHaveProperty('key');
    for (const k of keys) expect(bank.items.find((i) => i.id === k.item_id)!.payload.key).toBe(k.key);
    // Bookkeeping fields stay in the file; they are not columns.
    for (const row of items) expect(Object.keys(row).sort()).toEqual(['active', 'assessment_type', 'asset_path', 'difficulty', 'id', 'payload', 'source', 'source_ref']);
  });

  it('overrides the printed direction only where a question does not fit its section', () => {
    expect(keyed.filter(({ k }) => k.direction).map(({ q }) => q.n)).toEqual([51, 70, 73]);
  });
});
