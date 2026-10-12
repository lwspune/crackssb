import { describe, it, expect } from 'vitest';
import bank from '../../../content/oir-items.json' with { type: 'json' };
import { OPTION_LABELS, validateItem } from '../bank.ts';
import type { OptionLabel } from '../bank.ts';
import { lettersShort } from '../oir/check.ts';
import { isHeld } from '../oir/key.ts';
import type { KeyCheck, KeyedEntry, KeyEntry } from '../oir/key.ts';

/**
 * The checks every ingested OIR chapter must pass (D24), written once. A
 * chapter's own test file calls `chapterSuite` with what it expects, then adds
 * anything only that chapter needs. (Chapter 11's file predates this and
 * carries its own copy of the same checks.)
 */

export interface SourceQuestion {
  readonly n: number;
  readonly page: number;
  readonly section: string;
  readonly stem: string;
  readonly options: Readonly<Record<OptionLabel, string>>;
  /** A book name here matched a real candidate's and was replaced (D21, D27). */
  readonly renamed?: boolean;
}

export interface SourceFile {
  readonly source: string;
  readonly chapter: number;
  readonly pages: readonly number[];
  readonly note?: string;
  /** `text: null`: the chapter prints no direction, and its items carry none. */
  readonly directions: readonly { readonly section: string; readonly text: string | null }[];
  readonly questions: readonly SourceQuestion[];
}

export interface ChapterSpec {
  readonly source: SourceFile;
  readonly key: Readonly<Record<number, KeyEntry>>;
  readonly idPrefix: string;
  readonly reasoningType: string;
  /** Questions printed, numbered 1..count. */
  readonly count: number;
  /** Exactly the questions held back. */
  readonly held: readonly number[];
  /** Exactly the keyed questions with no runnable check. */
  readonly reasoned: readonly number[];
  /** Exactly the questions whose printed direction is overridden. */
  readonly directionOverrides?: readonly number[];
}

const idOf = (spec: ChapterSpec, n: number) => `${spec.idPrefix}-q${String(n).padStart(3, '0')}`;
const others = (key: OptionLabel) => OPTION_LABELS.filter((l) => l !== key);

/** Runs a keyed entry's check against the print. Throws (via expect) when the rule does not fit. */
function runCheck(check: KeyCheck, q: SourceQuestion, k: KeyedEntry): void {
  const stem = k.stemFix ?? q.stem;
  switch (check.kind) {
    case 'letters': {
      expect(lettersShort(stem, q.options[k.key]), `${q.options[k.key]} can be made from ${stem}`).not.toEqual([]);
      for (const l of others(k.key)) expect(lettersShort(stem, q.options[l]), `option ${l} cannot be made either`).toEqual([]);
      return;
    }
    case 'computed': {
      // Spacing and a closing full stop are layout: "21,27" reads as "21, 27", "North-East." as "North-East".
      const norm = (s: string) => s.replace(/\s+/g, '').replace(/\.$/, '').toUpperCase();
      const reads = check.answer === null ? [] : OPTION_LABELS.filter((l) => norm(q.options[l]) === norm(String(check.answer)));
      if (reads.length > 0) {
        expect(reads, `options reading as ${check.answer}`).toEqual([k.key]);
        return;
      }
      const nones = OPTION_LABELS.filter((l) => /^(none|no letter)\b/i.test(q.options[l].trim()));
      expect(nones, `no option reads as ${check.answer}, so the key is the one "none" option`).toEqual([k.key]);
      return;
    }
    case 'reasoned':
      return;
    default:
      throw new Error(`Q${q.n}: check kind "${check.kind}" is not run by the chapter suite yet`);
  }
}

export function chapterSuite(spec: ChapterSpec): void {
  const { source, key } = spec;
  const questions = source.questions;
  const keyed = questions.filter((q) => !isHeld(key[q.n])).map((q) => ({ q, k: key[q.n] as KeyedEntry }));

  describe(`chapter ${source.chapter}: the transcription`, () => {
    it(`holds questions 1-${spec.count} in order, each with four options`, () => {
      expect(questions.map((q) => q.n)).toEqual(Array.from({ length: spec.count }, (_, i) => i + 1));
      for (const q of questions) for (const l of OPTION_LABELS) expect(q.options[l], `Q${q.n} ${l}`).toBeTruthy();
    });

    it('declares any replaced name in the source note (D27)', () => {
      if (questions.some((q) => q.renamed)) expect(source.note ?? '').toMatch(/D27/);
    });

    it('keeps every question within the chapter pages, under a printed direction', () => {
      const [first, last] = [source.pages[0], source.pages[source.pages.length - 1]];
      for (const q of questions) {
        expect(q.page, `Q${q.n}`).toBeGreaterThanOrEqual(first);
        expect(q.page, `Q${q.n}`).toBeLessThanOrEqual(last);
        expect(source.directions.map((d) => d.section), `Q${q.n}`).toContain(q.section);
      }
    });
  });

  describe(`chapter ${source.chapter}: the key`, () => {
    it('covers every question exactly once', () => {
      expect(Object.keys(key).map(Number).sort((a, b) => a - b)).toEqual(questions.map((q) => q.n));
    });

    it(`holds back exactly ${spec.held.length}, each with a reason`, () => {
      const held = questions.filter((q) => isHeld(key[q.n])).map((q) => q.n);
      expect(held).toEqual(spec.held);
      for (const n of held) expect((key[n] as { reason: string }).reason.length, `Q${n}`).toBeGreaterThan(20);
    });

    it('gives every keyed answer a rule, and a note wherever confidence is not high or the stem was changed', () => {
      for (const { q, k } of keyed) {
        expect(OPTION_LABELS, `Q${q.n}`).toContain(k.key);
        expect(k.rule.length, `Q${q.n} rule`).toBeGreaterThan(5);
        if (k.confidence !== 'high' || k.stemFix) expect(k.note, `Q${q.n} note`).toBeTruthy();
      }
    });

    it('leaves exactly the declared questions to reasoning alone', () => {
      expect(keyed.filter(({ k }) => k.check.kind === 'reasoned').map(({ q }) => q.n)).toEqual(spec.reasoned);
    });

    it.each(keyed.filter(({ k }) => k.check.kind !== 'reasoned').map(({ q, k }) => [q.n, q, k] as const))(
      'Q%i: the rule fits the print, and only the keyed option fits it',
      (_n, q, k) => runCheck(k.check, q, k),
    );
  });

  describe(`chapter ${source.chapter}: the bank built from it (content/oir-items.json)`, () => {
    const items = bank.items.filter((i) => i.id.startsWith(`${spec.idPrefix}-`));
    const itemFor = (n: number) => items.find((i) => i.id === idOf(spec, n))!;

    it('holds every keyed question, in order, and none of the held ones', () => {
      expect(items.map((i) => i.id)).toEqual(keyed.map(({ q }) => idOf(spec, q.n)));
    });

    it('passes the bank validator', () => {
      for (const item of items) expect(() => validateItem(item)).not.toThrow();
    });

    it('carries the derived key, the printed stem (or its declared fix), the options verbatim and the direction', () => {
      for (const { q, k } of keyed) {
        const item = itemFor(q.n);
        expect(item.payload.key, `Q${q.n}`).toBe(k.key);
        expect(item.payload.stem, `Q${q.n}`).toBe(k.stemFix ?? q.stem);
        expect(item.payload.options, `Q${q.n}`).toEqual(q.options);
        expect(item.payload.reasoningType).toBe(spec.reasoningType);
        expect(item.payload.direction, `Q${q.n}`).toBe(k.direction ?? source.directions.find((d) => d.section === q.section)!.text ?? undefined);
        expect(item.key_basis).toBe('derived');
        expect(item.rule).toBe(k.rule);
        expect(item.source_ref).toBe(`ch${source.chapter} p${q.page} q${q.n}`);
      }
    });

    it('overrides the printed direction only where declared', () => {
      expect(keyed.filter(({ k }) => k.direction).map(({ q }) => q.n)).toEqual(spec.directionOverrides ?? []);
    });
  });
}
