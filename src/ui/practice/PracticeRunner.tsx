'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OPTION_LABELS } from '@/items/bank.ts';
import type { OptionLabel } from '@/items/bank.ts';
import type { Figure } from '@/items/oir/figure.ts';
import type { DiceFigure } from '@/items/oir/dice.ts';
import type { AnswerPanel } from '@/items/bank.ts';
import { OptionButton, optionGridClass, QuestionBody } from './Question.tsx';

/**
 * Chapter practice (D26): one question at a time, untimed. The candidate
 * answers; only then does the server return the key and its rule
 * (answer_practice, 0007). Nothing here knows a key before that.
 */

export interface PracticeItem {
  readonly id: string;
  readonly stem: string;
  readonly direction?: string;
  /** Information shared by a group of questions, shown after the direction and before the question. */
  readonly passage?: string;
  /** A number-grid question's printed tables, drawn in place of the stem. '' is a blank cell. */
  readonly tables?: readonly (readonly (readonly string[])[])[];
  /** A redrawn figure (D29), drawn in place of the stem; the stem describes it for screen readers. */
  readonly figure?: Figure;
  /** Dice views and nets (D29), drawn in place of the stem; the stem describes them. */
  readonly dice?: DiceFigure;
  /** Picture answers (D29), drawn in the option buttons; `options` keeps each described in words. */
  readonly answerPanels?: Readonly<Record<OptionLabel, AnswerPanel>>;
  readonly options: Readonly<Record<OptionLabel, string>>;
}

export type PracticeResult =
  | { readonly ok: true; readonly correct: boolean; readonly key: OptionLabel; readonly rule: string | null }
  | { readonly ok: false; readonly message: string };

interface Props {
  readonly items: readonly PracticeItem[];
  readonly answer: (itemId: string, chosen: OptionLabel) => Promise<PracticeResult>;
  /** Where "Back to chapters" goes. */
  readonly doneHref: string;
}

interface Reveal {
  readonly chosen: OptionLabel;
  readonly key: OptionLabel;
  readonly correct: boolean;
  readonly rule: string | null;
}

/** Keys typed into a field belong to the field. */
function typingIn(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function PracticeRunner({ items, answer, doneHref }: Props) {
  const [index, setIndex] = useState(0);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tally, setTally] = useState({ answered: 0, right: 0 });
  const [finished, setFinished] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  const stemRef = useRef<HTMLDivElement>(null);

  const item = items[index];
  const last = index === items.length - 1;

  const choose = useCallback(
    async (chosen: OptionLabel) => {
      if (!item || reveal || pending) return;
      setPending(true);
      setError(null);
      const r = await answer(item.id, chosen);
      setPending(false);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setReveal({ chosen, key: r.key, correct: r.correct, rule: r.rule });
      setTally((t) => ({ answered: t.answered + 1, right: t.right + (r.correct ? 1 : 0) }));
    },
    [item, reveal, pending, answer],
  );

  const next = useCallback(() => {
    if (!reveal) return;
    setReveal(null);
    setError(null);
    if (last) setFinished(true);
    else setIndex((i) => i + 1);
  }, [reveal, last]);

  // Focus follows the step: Next once revealed, the new question once moved on.
  useEffect(() => {
    if (reveal) nextRef.current?.focus();
  }, [reveal]);
  useEffect(() => {
    if (index > 0) stemRef.current?.focus();
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (finished || e.altKey || e.ctrlKey || e.metaKey || typingIn(e.target)) return;
      const letter = e.key.toUpperCase();
      if (!reveal && (OPTION_LABELS as readonly string[]).includes(letter)) {
        e.preventDefault();
        void choose(letter as OptionLabel);
      } else if (reveal && e.key === 'Enter' && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement)) {
        // A focused button already clicks on Enter; acting here too would skip a question.
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finished, reveal, choose, next]);

  if (finished || !item) {
    return (
      <section className="rise rounded-xl border bg-card p-6 text-center shadow-card sm:p-8" aria-labelledby="practice-done">
        <p className="eyebrow text-muted-foreground">Set done</p>
        <h2 id="practice-done" className="mt-2 text-3xl font-bold tabular-nums tracking-tight">
          {tally.right} of {tally.answered} right
        </h2>
        <Link
          href={doneHref}
          className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand px-5 font-semibold text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Back to chapters
        </Link>
      </section>
    );
  }

  const progress = ((index + (reveal ? 1 : 0)) / items.length) * 100;

  return (
    <section className="rounded-xl border bg-card shadow-card" aria-label="Question">
      <div className="h-1 overflow-hidden rounded-t-xl bg-secondary" aria-hidden="true">
        <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-5 sm:p-8">
        <p className="eyebrow tabular-nums text-muted-foreground">
          {index + 1} of {items.length}
        </p>
        <QuestionBody item={item} stemRef={stemRef} />

        <div className={`mt-6 ${optionGridClass(item)}`} role="group" aria-label="Options">
          {OPTION_LABELS.map((label) => {
            const isKey = reveal?.key === label;
            const isWrongPick = reveal && reveal.chosen === label && !reveal.correct;
            const tone = isKey
              ? 'border-correct ring-1 ring-correct'
              : isWrongPick
                ? 'border-incorrect ring-1 ring-incorrect'
                : 'border-border hover:border-brand/60';
            const badge = isKey ? 'bg-correct text-card' : isWrongPick ? 'bg-incorrect text-card' : 'bg-secondary text-secondary-foreground';
            return (
              <OptionButton
                key={label}
                item={item}
                label={label}
                tone={tone}
                badge={badge}
                disabled={Boolean(reveal) || pending}
                onClick={() => void choose(label)}
              />
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-incorrect">
            {error}
          </p>
        )}

        <div role="status" className="mt-6 empty:hidden">
          {reveal && (
            <div className="rise rounded-lg bg-secondary p-4">
              <p className={`font-bold ${reveal.correct ? 'text-correct' : 'text-incorrect'}`}>
                {reveal.correct ? 'Right.' : `Wrong. The answer is ${reveal.key}.`}
              </p>
              {reveal.rule && <p className="mt-1 text-sm text-secondary-foreground">{reveal.rule}</p>}
            </div>
          )}
        </div>

        {reveal && (
          <div className="mt-6 flex justify-end">
            <button
              ref={nextRef}
              type="button"
              onClick={next}
              className="inline-flex min-h-11 items-center rounded-lg bg-brand px-6 font-semibold text-brand-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {last ? 'Finish' : 'Next'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
