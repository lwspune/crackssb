import { OPTION_LABELS } from '../../items/bank.ts';
import { OIR_CHAPTERS } from '../../oir/chapters.ts';
import type { ResultRow } from '../../oir/mock-result.ts';
import { AnswerPanelDrawing } from '../practice/AnswerPanelDrawing.tsx';
import type { PracticeItem } from '../practice/PracticeRunner.tsx';
import { optionGridClass, QuestionBody } from '../practice/Question.tsx';

/**
 * A finished mock, question by question (D32): the question as it was shown,
 * the answer, the one chosen, and the rule. Server-rendered and static — the
 * options are a list here, not buttons.
 */

export type ReviewFilter = 'all' | 'wrong' | 'skipped';

const titleOf = (type: string) => OIR_CHAPTERS.find((c) => c.reasoningType === type)?.title ?? type;

export function MockReview({ items, rows, show }: { items: readonly PracticeItem[]; rows: readonly ResultRow[]; show: ReviewFilter }) {
  const shown = rows.filter((r) => (show === 'wrong' ? r.chosen !== '' && r.chosen !== r.key : show === 'skipped' ? r.chosen === '' : true));
  if (shown.length === 0) return <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">None.</p>;

  return (
    <div className="space-y-4">
      {shown.map((r) => {
        const item = items[r.ordinal];
        const status = r.chosen === '' ? 'Left blank' : r.chosen === r.key ? 'Right' : 'Wrong';
        const chip = status === 'Right' ? 'bg-correct/15 text-correct' : status === 'Wrong' ? 'bg-incorrect/15 text-incorrect' : 'bg-secondary text-muted-foreground';
        return (
          <article key={r.ordinal} aria-label={`Question ${r.ordinal + 1}`} className="rounded-xl border bg-card p-5 shadow-card sm:p-6">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <p className="eyebrow tabular-nums text-muted-foreground">
                Question {r.ordinal + 1} · {titleOf(r.reasoning_type)}
              </p>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${chip}`}>{status}</span>
            </header>
            <QuestionBody item={item} />
            <ul className={`mt-5 ${optionGridClass(item)}`}>
              {OPTION_LABELS.map((label) => {
                const isKey = label === r.key;
                const isChosen = label === r.chosen;
                const marks = [isChosen ? 'your answer' : null, isKey ? 'the answer' : null].filter(Boolean).join(', ');
                const tone = isKey ? 'border-correct ring-1 ring-correct' : isChosen ? 'border-incorrect ring-1 ring-incorrect' : 'border-border';
                const badge = isKey ? 'bg-correct text-card' : isChosen ? 'bg-incorrect text-card' : 'bg-secondary text-secondary-foreground';
                return (
                  <li
                    key={label}
                    aria-label={`Option ${label}, ${item.options[label]}${marks ? ` — ${marks}` : ''}`}
                    className={`flex min-h-14 items-center gap-3 rounded-lg border bg-card px-3 ${tone}`}
                  >
                    <span aria-hidden="true" className={`grid size-8 shrink-0 place-items-center rounded-md text-sm font-bold ${badge}`}>
                      {label}
                    </span>
                    {item.answerPanels ? (
                      <span aria-hidden="true" className="flex min-w-0 flex-1 justify-center py-2">
                        <AnswerPanelDrawing panel={item.answerPanels[label]} />
                      </span>
                    ) : (
                      <span aria-hidden="true" className="min-w-0 break-words text-lg font-medium tabular-nums">
                        {item.options[label]}
                      </span>
                    )}
                    {marks && (
                      <span aria-hidden="true" className={`ml-auto shrink-0 text-xs font-semibold ${isKey ? 'text-correct' : 'text-incorrect'}`}>
                        {isKey ? 'Answer' : 'Yours'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {r.rule && <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-secondary-foreground">{r.rule}</p>}
          </article>
        );
      })}
    </div>
  );
}
