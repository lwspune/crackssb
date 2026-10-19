import type { ReactNode } from 'react';

/**
 * An SRT (D39) or SDT (D40) attempt's result, on paper (D38): the session
 * code, the sheet's photos (the upload, for the candidate who took it), and
 * every situation or prompt, numbered, to check the sheet against. Once a
 * mentor has marked an SDT, each paragraph's mark sits beside its prompt.
 * Server-renderable.
 */

interface Props {
  /** "The situations", "The paragraphs". */
  readonly heading: string;
  readonly items: readonly string[];
  readonly paperCode: string | null;
  readonly sheet?: ReactNode;
  /** One per item, once marked: a mark, or null for "not written". */
  readonly marks?: readonly (number | null)[] | null;
  /** Sending for review, or the mentor's marks. */
  readonly footer?: ReactNode;
  readonly forStaff?: boolean;
}

export function PaperResult({ heading, items, paperCode, sheet, marks, footer, forStaff = false }: Props) {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-dashed p-5">
        <p className="font-semibold">{forStaff ? 'The answers are on the sheet.' : 'Your answers are on your sheet.'}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Session code <span className="font-mono font-semibold text-foreground">{paperCode ?? '—'}</span>.
          {forStaff ? ' It is on every page of the sheet.' : ' Photograph every page, flat, in good light.'}
        </p>
      </section>
      {sheet}

      <section aria-labelledby="items-h">
        <h2 id="items-h" className="text-lg font-bold">{heading}</h2>
        <ol aria-label={heading} className="mt-4 divide-y overflow-hidden rounded-xl border bg-card shadow-card">
          {items.map((text, i) => (
            <li key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-3 px-4 py-3 text-sm">
              <span className="text-right tabular-nums text-muted-foreground">{i + 1}</span>
              <span>{text}</span>
              {marks && (marks[i] == null ? <span className="text-muted-foreground">Not written</span> : <span className="font-semibold tabular-nums">{marks[i]} / 5</span>)}
            </li>
          ))}
        </ol>
      </section>

      {footer}
    </div>
  );
}
