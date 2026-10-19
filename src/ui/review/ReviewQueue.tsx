import Link from 'next/link';

/**
 * The review queue (D34, D36, UI.md §5): PPDT and TAT attempts sent for review, the oldest
 * waiting first, then those already marked. Server-renderable.
 */

export interface QueueRow {
  readonly sessionId: string;
  readonly name: string;
  /** What was sent: "PPDT · Picture 3", "TAT set 1". */
  readonly label: string;
  readonly input: 'typed' | 'paper';
  readonly submittedAt: string;
  /** Null where there is no narration to give (TAT). */
  readonly hasNarration: boolean | null;
  readonly reviewedAt: string | null;
}

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

function List({ id, title, rows, when }: { id: string; title: string; rows: readonly QueueRow[]; when: (r: QueueRow) => string }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title} <span className="tabular-nums">· {rows.length}</span>
      </h2>
      <ul className="mt-3 divide-y overflow-hidden rounded-xl border bg-card shadow-card">
        {rows.map((r) => (
          <li key={r.sessionId}>
            <Link
              href={`/staff/review/${r.sessionId}`}
              className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="font-semibold">{r.name}</span>
              <span className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                <span>{r.label}</span>
                <span>{r.input === 'paper' ? 'Paper' : 'Typed'}</span>
                {r.hasNarration !== null && <span>{r.hasNarration ? 'Narrated' : 'No narration'}</span>}
                <span className="tabular-nums">{when(r)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ReviewQueue({ rows }: { rows: readonly QueueRow[] }) {
  const waiting = rows.filter((r) => !r.reviewedAt);
  const reviewed = rows.filter((r) => r.reviewedAt).sort((a, b) => b.reviewedAt!.localeCompare(a.reviewedAt!));
  return (
    <div className="space-y-8">
      {waiting.length > 0 ? (
        <List id="waiting-h" title="Waiting" rows={waiting} when={(r) => `Sent ${day(r.submittedAt)}`} />
      ) : (
        <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Nothing waiting.</p>
      )}
      {reviewed.length > 0 && <List id="reviewed-h" title="Reviewed" rows={reviewed} when={(r) => `Marked ${day(r.reviewedAt!)}`} />}
    </div>
  );
}
