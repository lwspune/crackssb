import Link from 'next/link';
import type { PpdtAttempt } from '../../ppdt/attempts.ts';
import { ArrowIcon } from '../icons.tsx';

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** The viewer's PPDT attempts, newest first: a finished one opens its result, a running one its picture (D33). */
export function PpdtAttemptList({ attempts }: { attempts: readonly PpdtAttempt[] }) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {attempts.map((a) => (
        <li key={a.sessionId}>
          <Link
            href={a.over ? `/results/ppdt/${a.sessionId}` : `/picture/${a.itemId}`}
            className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 hover:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
          >
            <span className="min-w-0">
              <span className="block font-semibold">Picture {Number(a.itemId.slice(-2))}</span>
              <span className="block text-sm text-muted-foreground">
                {day.format(new Date(a.startedAt))}
                {a.input === 'paper' ? ' · on paper' : ''}
              </span>
            </span>
            <span className="flex items-center gap-3">
              {!a.over && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">In progress</span>}
              <ArrowIcon aria-hidden="true" width={16} height={16} className="text-muted-foreground" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
