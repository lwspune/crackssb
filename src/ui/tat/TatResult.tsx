import type { ReactNode } from 'react';
import type { TatPicture } from '../../tat/pictures.ts';
import type { TatReview } from '../../tat/rubric.ts';
import type { TatSetMeta } from './TatRunner.tsx';

/**
 * A TAT attempt's result (D36, D38): every slide at last, with what a careful
 * look finds in it (our ground truth) to check the stories against; the
 * session code; the sheet's photos. Once a mentor has marked it, each story's
 * mark and note sit beside its slide. No model stories: ROADMAP rules them
 * out. Server-renderable.
 */

interface Props {
  readonly set: TatSetMeta;
  /** The eleven pictures' ground truth, in slide order. */
  readonly pictures: readonly TatPicture[];
  readonly paperCode: string | null;
  /** The sheet's photos, with the upload for the candidate who took it. */
  readonly sheet?: ReactNode;
  /** Sending for review, or the mentor's word on the set, after the photos. */
  readonly footer?: ReactNode;
  readonly review?: TatReview | null;
  /** A mentor marking it. */
  readonly forStaff?: boolean;
}

function Mark({ mark, note }: { mark: number | null; note: string | null }) {
  return (
    <div className="mt-3 border-t pt-3 text-sm">
      {mark === null ? (
        <p className="text-muted-foreground">Not marked</p>
      ) : (
        <p className="flex items-center gap-3">
          <span aria-hidden="true" className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={`h-2 w-5 rounded-full ${n <= mark ? 'bg-brand' : 'bg-secondary'}`} />
            ))}
          </span>
          <span className="font-semibold tabular-nums">{mark} / 5</span>
        </p>
      )}
      {note && <p className="mt-1 text-muted-foreground">{note}</p>}
    </div>
  );
}

export function TatResult({ set, pictures, paperCode, sheet, footer, review, forStaff = false }: Props) {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-dashed p-5">
        <p className="font-semibold">{forStaff ? 'The stories are on the sheet.' : 'Your stories are on your sheet.'}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Session code <span className="font-mono font-semibold text-foreground">{paperCode ?? '—'}</span>.
          {forStaff ? ' It is on every page of the sheet.' : ' Check each story against its picture below.'}
        </p>
      </section>
      {sheet}

      <section aria-labelledby="slides-h">
        <h2 id="slides-h" className="text-lg font-bold">The slides, and what is in them</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-2">
          {set.slides.map((slide, i) => {
            const picture = pictures[i];
            const marked = review?.stories[i];
            return (
              <li key={slide.id} className="rounded-xl border bg-card p-4 shadow-card">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Story {i + 1}</p>
                {slide.image && picture ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={slide.image} alt={`Slide ${i + 1}: ${picture.title}`} className="mt-2 w-full rounded-lg border" />
                    <p className="mt-3 font-semibold">{picture.title}</p>
                    <p className="mt-1 text-sm">{picture.shows}</p>
                  </>
                ) : (
                  <>
                    <div aria-hidden="true" className="mt-2 aspect-[4/3] w-full rounded-lg border bg-white" />
                    <p className="mt-3 font-semibold">Blank slide</p>
                    <p className="mt-1 text-sm">A story of your own choosing.</p>
                  </>
                )}
                {review && <Mark mark={marked?.mark ?? null} note={marked?.note ?? null} />}
              </li>
            );
          })}
        </ol>
      </section>

      {footer}
    </div>
  );
}
