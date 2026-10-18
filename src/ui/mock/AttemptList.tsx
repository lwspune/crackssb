import Link from 'next/link';
import type { Attempt } from '../../oir/mock-result.ts';
import { ArrowIcon } from '../icons.tsx';
import type { MockMeta } from './BookletRunner.tsx';

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** The viewer's mock attempts, newest first: a finished one opens its result, a running one its mock (D32). */
export function AttemptList({ attempts, mocks }: { attempts: readonly Attempt[]; mocks: readonly MockMeta[] }) {
  const meta = new Map(mocks.map((m) => [m.id, m]));
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
      {attempts.map((a) => {
        const m = meta.get(a.testId);
        return (
          <li key={a.sessionId}>
            <Link
              href={a.over ? `/results/mock/${a.sessionId}` : `/mock/${a.testId}`}
              className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 hover:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{m?.title ?? a.testId}</span>
                <span className="block text-sm text-muted-foreground">{day.format(new Date(a.startedAt))}</span>
              </span>
              <span className="flex items-center gap-3">
                {a.over ? (
                  <span className="text-lg font-bold tabular-nums">
                    {a.correct ?? 0}/{m?.itemCount ?? 40}
                  </span>
                ) : (
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">In progress</span>
                )}
                <ArrowIcon aria-hidden="true" width={16} height={16} className="text-muted-foreground" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
