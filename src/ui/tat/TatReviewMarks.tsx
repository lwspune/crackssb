import type { TatReview } from '../../tat/rubric.ts';

/**
 * A mentor's word on a TAT set, as the candidate reads it (D36). Each story's
 * mark sits beside its slide (TatResult); here is what went well and what to
 * work on. No total and no band (D15). Server-renderable.
 */

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export function TatReviewMarks({ review }: { review: TatReview }) {
  const marked = review.stories.filter((s) => s.mark !== null).length;
  return (
    <section aria-labelledby="review-h" className="rounded-xl border border-brand/30 bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="review-h" className="text-lg font-bold">Your mentor’s marks</h2>
        <p className="text-sm text-muted-foreground">{day(review.at)}</p>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {marked} of {review.stories.length} stories marked. Each mark is beside its slide below.
      </p>
      {(review.wentWell || review.focusOn) && (
        <dl className="mt-4 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
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
