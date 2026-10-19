import Link from 'next/link';
import { ArrowIcon } from '../icons.tsx';

/** One attempt as Results lists it: a finished one opens its result, a running one its test. */
export interface AttemptRow {
  readonly key: string;
  /** null: nowhere to go (the owner sees someone else's running attempt, D42). */
  readonly href: string | null;
  readonly title: string;
  readonly startedAt: string;
  readonly live: boolean;
  readonly paper: boolean;
  /** A mock's score, as "31/40". */
  readonly score?: string;
}

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

function Body({ r }: { r: AttemptRow }) {
  return (
    <>
      <span className="min-w-0">
        <span className="block font-semibold">{r.title}</span>
        <span className="block text-sm text-muted-foreground">
          {day.format(new Date(r.startedAt))}
          {r.paper ? ' · on paper' : ''}
        </span>
      </span>
      <span className="flex items-center gap-3">
        {r.live && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">In progress</span>}
        {r.score && <span className="text-lg font-bold tabular-nums">{r.score}</span>}
        {r.href && <ArrowIcon aria-hidden="true" width={16} height={16} className="text-muted-foreground" />}
      </span>
    </>
  );
}

/** A list of attempts, newest first (TAT and WAT, D36, D38; everything, on the owner's view of a candidate, D42). Server-renderable. */
export function AttemptRows({ rows }: { rows: readonly AttemptRow[] }) {
  const row = 'flex min-h-16 items-center justify-between gap-4 px-5 py-3';
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {rows.map((r) => (
        <li key={r.key}>
          {r.href ? (
            <Link href={r.href} className={`${row} hover:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring`}>
              <Body r={r} />
            </Link>
          ) : (
            <div className={row}>
              <Body r={r} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
