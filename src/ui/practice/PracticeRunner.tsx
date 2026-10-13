'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OPTION_LABELS } from '@/items/bank.ts';
import type { OptionLabel } from '@/items/bank.ts';
import type { Figure } from '@/items/oir/figure.ts';
import type { DiceFigure } from '@/items/oir/dice.ts';
import type { AnswerPanel } from '@/items/bank.ts';
import { AnswerPanelDrawing } from './AnswerPanelDrawing.tsx';
import { DiceDrawing } from './DiceDrawing.tsx';
import { FigureDrawing } from './FigureDrawing.tsx';

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

/** Longer than this, an option word breaks mid-word in half a phone's width ("SITUATI ON"). */
const HALF_WIDTH_CHARS = 8;
/** A single token longer than this does not fit a 320 px phone at the stem's full size. */
const FULL_SIZE_TOKEN_CHARS = 12;
/** Words that make a stem a sentence to read rather than a figure to look at ("S O _ _ T A S _ _" has none). */
const PROSE_WORDS = /\b(the|of|is|to|which|what|how|if|in|from|are|will|and)\b/gi;
const isProse = (stem: string) => (stem.match(PROSE_WORDS) ?? []).length >= 2;

/** A number-grid question as the book prints it: each table bordered cell by cell, a blank cell undrawn, the missing term marked. */
function PrintedTables({ tables }: { readonly tables: NonNullable<PracticeItem['tables']> }) {
  return (
    <div className="mt-4 flex flex-wrap items-start gap-4">
      {tables.map((rows, t) => (
        <table key={t} aria-label={`Figure ${t + 1} of ${tables.length}`} className="border-collapse text-center text-lg font-semibold tabular-nums sm:text-xl">
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) =>
                  cell === '' ? (
                    <td key={c} data-blank="" className="min-w-11 px-2 py-1.5" />
                  ) : (
                    <td
                      key={c}
                      {...(cell === '?' ? { 'data-missing': '' } : {})}
                      className={`min-w-11 border border-border px-2 py-1.5 ${cell === '?' ? 'bg-accent text-brand-accent' : ''}`}
                    >
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </div>
  );
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
  const stacked = !item.answerPanels && OPTION_LABELS.some((l) => item.options[l].length > HALF_WIDTH_CHARS);
  const stemSize =
    isProse(item.stem)
      ? 'text-lg font-medium leading-relaxed sm:text-xl'
      : item.stem.split(/\s+/).some((t) => t.length > FULL_SIZE_TOKEN_CHARS)
        ? 'text-xl font-semibold tracking-wide sm:text-3xl'
        : 'text-2xl font-semibold tracking-wide sm:text-3xl';

  return (
    <section className="rounded-xl border bg-card shadow-card" aria-label="Question">
      <div className="h-1 overflow-hidden rounded-t-xl bg-secondary" aria-hidden="true">
        <div className="h-full bg-brand transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="p-5 sm:p-8">
        <p className="eyebrow tabular-nums text-muted-foreground">
          {index + 1} of {items.length}
        </p>
        {item.direction && <p className="mt-3 text-sm text-muted-foreground">{item.direction}</p>}
        {item.passage && <p className="mt-3 whitespace-pre-line rounded-lg bg-secondary p-4 text-sm leading-relaxed text-secondary-foreground">{item.passage}</p>}
        <div ref={stemRef} tabIndex={-1} className="outline-none">
          {item.dice ? (
            <DiceDrawing dice={item.dice} label={item.stem} />
          ) : item.figure ? (
            <FigureDrawing figure={item.figure} label={item.stem} />
          ) : item.tables ? (
            <PrintedTables tables={item.tables} />
          ) : (
            <p className={`mt-2 whitespace-pre-line break-words tabular-nums ${stemSize}`}>{item.stem}</p>
          )}
        </div>

        <div className={`mt-6 grid gap-3 ${stacked ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`} role="group" aria-label="Options">
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
              <button
                key={label}
                type="button"
                aria-label={`Option ${label}, ${item.options[label]}`}
                disabled={Boolean(reveal) || pending}
                onClick={() => void choose(label)}
                className={`flex min-h-14 items-center gap-3 rounded-lg border bg-card px-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default ${tone}`}
              >
                <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-md text-sm font-bold ${badge}`}>
                  {label}
                </span>
                {item.answerPanels ? (
                  <span className="flex min-w-0 flex-1 justify-center py-2">
                    <AnswerPanelDrawing panel={item.answerPanels[label]} />
                  </span>
                ) : (
                  <span className="min-w-0 break-words text-lg font-medium tabular-nums">{item.options[label]}</span>
                )}
              </button>
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
