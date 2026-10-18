import { NARRATION_HEADINGS, STORY_HEADINGS } from '../../ppdt/rubric.ts';
import type { Review } from '../../ppdt/rubric.ts';

/**
 * A mentor's marks, as the candidate reads them (D34): each heading out of
 * five, what went well, what to work on. No total and no band — the headings
 * are the feedback (D15). Server-renderable.
 */

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

function Row({ label, mark }: { label: string; mark: number }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span>{label}</span>
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} className={`h-2 w-5 rounded-full ${n <= mark ? 'bg-brand' : 'bg-secondary'}`} />
          ))}
        </span>
        <span className="w-10 text-right font-semibold tabular-nums">
          {mark} / 5
        </span>
      </span>
    </li>
  );
}

export function ReviewMarks({ review }: { review: Review }) {
  return (
    <section aria-labelledby="review-h" className="rounded-xl border border-brand/30 bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="review-h" className="text-lg font-bold">Your mentor’s marks</h2>
        <p className="text-sm text-muted-foreground">{day(review.at)}</p>
      </div>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Story</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {STORY_HEADINGS.map((h) => (
              <Row key={h.key} label={h.label} mark={review.story[h.key]} />
            ))}
          </ul>
        </div>
        {review.narration && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Narration</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {NARRATION_HEADINGS.map((h) => (
                <Row key={h.key} label={h.label} mark={review.narration![h.key]} />
              ))}
            </ul>
          </div>
        )}
      </div>
      {(review.wentWell || review.focusOn) && (
        <dl className="mt-5 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
          {review.wentWell && (
            <div>
              <dt className="font-semibold">Went well</dt>
              <dd className="mt-1 whitespace-pre-line text-muted-foreground">{review.wentWell}</dd>
            </div>
          )}
          {review.focusOn && (
            <div>
              <dt className="font-semibold">Work on</dt>
              <dd className="mt-1 whitespace-pre-line text-muted-foreground">{review.focusOn}</dd>
            </div>
          )}
        </dl>
      )}
    </section>
  );
}
