import Link from 'next/link';
import { ArrowIcon } from '../icons.tsx';

/** One attempt as Results lists it: a finished one opens its result, a running one its test. */
export interface AttemptRow {
  readonly key: string;
  readonly href: string;
  readonly title: string;
  readonly startedAt: string;
  readonly live: boolean;
  readonly paper: boolean;
}

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** A list of attempts, newest first (TAT and WAT, D36, D38). Server-renderable. */
export function AttemptRows({ rows }: { rows: readonly AttemptRow[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {rows.map((r) => (
        <li key={r.key}>
          <Link
            href={r.href}
            className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 hover:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="min-w-0">
              <span className="block font-semibold">{r.title}</span>
              <span className="block text-sm text-muted-foreground">
                {day.format(new Date(r.startedAt))}
                {r.paper ? ' · on paper' : ''}
              </span>
            </span>
            <span className="flex items-center gap-3">
              {r.live && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">In progress</span>}
              <ArrowIcon aria-hidden="true" width={16} height={16} className="text-muted-foreground" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
