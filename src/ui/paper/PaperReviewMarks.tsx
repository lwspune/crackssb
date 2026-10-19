/**
 * A mentor's marks on an SRT (D39) or SDT (D40), as the candidate reads them:
 * a line of summary, each heading out of five, what went well and what to
 * work on. No total and no band (D15). Server-renderable.
 */

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

interface Props {
  readonly summary?: string;
  readonly rows: readonly { readonly label: string; readonly mark: number }[];
  readonly wentWell: string | null;
  readonly focusOn: string | null;
  readonly at: string;
}

export function PaperReviewMarks({ summary, rows, wentWell, focusOn, at }: Props) {
  return (
    <section aria-labelledby="review-h" className="rounded-xl border border-brand/30 bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="review-h" className="text-lg font-bold">Your mentor’s marks</h2>
        <p className="text-sm text-muted-foreground">{day(at)}</p>
      </div>
      {summary && <p className="mt-1 text-sm text-muted-foreground">{summary}</p>}
      <ul className="mt-4 space-y-2 text-sm">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4">
            <span>{r.label}</span>
            <span className="flex items-center gap-3">
              <span aria-hidden="true" className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} className={`h-2 w-5 rounded-full ${n <= r.mark ? 'bg-brand' : 'bg-secondary'}`} />
                ))}
              </span>
              <span className="w-10 text-right font-semibold tabular-nums">{r.mark} / 5</span>
            </span>
          </li>
        ))}
      </ul>
      {(wentWell || focusOn) && (
        <dl className="mt-5 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
          {wentWell && (
            <div>
              <dt className="font-semibold">Went well</dt>
              <dd className="mt-1 whitespace-pre-line text-muted-foreground">{wentWell}</dd>
            </div>
          )}
          {focusOn && (
            <div>
              <dt className="font-semibold">Work on</dt>
              <dd className="mt-1 whitespace-pre-line text-muted-foreground">{focusOn}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
