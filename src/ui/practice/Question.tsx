import type { Ref } from 'react';
import { OPTION_LABELS } from '@/items/bank.ts';
import type { OptionLabel } from '@/items/bank.ts';
import { AnswerPanelDrawing } from './AnswerPanelDrawing.tsx';
import { DiceDrawing } from './DiceDrawing.tsx';
import { FigureDrawing } from './FigureDrawing.tsx';
import type { PracticeItem } from './PracticeRunner.tsx';

/**
 * One OIR question as the book prints it, shared by chapter practice (D26)
 * and the mocks (D32): the direction, any passage, then the stem — or the
 * drawing or tables shown in its place — and the four option buttons.
 */

/** Longer than this, an option word breaks mid-word in half a phone's width ("SITUATI ON"). */
const HALF_WIDTH_CHARS = 8;
/** More glyphs than this do not fit half a phone's width without wrapping, which would change the picture. */
const GLYPHS_IN_HALF_WIDTH = 6;
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

/** Everything above the options. `stemRef` receives focus when the question changes. */
export function QuestionBody({ item, stemRef }: { readonly item: PracticeItem; readonly stemRef?: Ref<HTMLDivElement> }) {
  const stemSize = isProse(item.stem)
    ? 'text-lg font-medium leading-relaxed sm:text-xl'
    : item.stem.split(/\s+/).some((t) => t.length > FULL_SIZE_TOKEN_CHARS)
      ? 'text-xl font-semibold tracking-wide sm:text-3xl'
      : 'text-2xl font-semibold tracking-wide sm:text-3xl';
  return (
    <>
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
    </>
  );
}

/** The options' grid: two across, or one across on a phone when an option is too wide for half of it. */
export function optionGridClass(item: PracticeItem): string {
  const stacked = item.answerPanels
    ? OPTION_LABELS.some((l) => (item.answerPanels![l].glyphs?.length ?? 0) > GLYPHS_IN_HALF_WIDTH)
    : OPTION_LABELS.some((l) => item.options[l].length > HALF_WIDTH_CHARS);
  return `grid gap-3 ${stacked ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`;
}

interface OptionProps {
  readonly item: PracticeItem;
  readonly label: OptionLabel;
  /** Border and ring classes. */
  readonly tone: string;
  /** The letter badge's classes. */
  readonly badge: string;
  readonly disabled?: boolean;
  /** A chosen-but-not-yet-marked answer (mocks). Omitted where choosing is final (practice). */
  readonly pressed?: boolean;
  readonly onClick: () => void;
}

export function OptionButton({ item, label, tone, badge, disabled, pressed, onClick }: OptionProps) {
  return (
    <button
      type="button"
      aria-label={`Option ${label}, ${item.options[label]}`}
      {...(pressed === undefined ? {} : { 'aria-pressed': pressed })}
      disabled={disabled}
      onClick={onClick}
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
}
