import Link from 'next/link';
import type { Standing } from '../../oir/mock-result.ts';
import type { MockMeta } from './BookletRunner.tsx';

/** The OIR mocks (D32), each with where the viewer stands on it: not taken, in progress, or their best. */
export function MockGrid({ mocks, standing }: { mocks: readonly MockMeta[]; standing: ReadonlyMap<string, Standing> }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
      {mocks.map((m) => {
        const s = standing.get(m.id);
        const n = Number(m.id.slice(-2));
        const taken = s !== undefined && s.tries > 0;
        const line = s?.live ? 'in progress' : taken ? `best ${s.best ?? 0} of ${m.itemCount}, taken ${s.tries} time${s.tries === 1 ? '' : 's'}` : 'not taken';
        return (
          <li key={m.id}>
            <Link
              href={`/mock/${m.id}`}
              aria-label={`${m.title}, ${line}`}
              className={`lift flex h-full flex-col rounded-xl border bg-card p-4 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${s?.live ? 'border-brand-accent' : 'border-brand/30'}`}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Mock</span>
              <span className="text-2xl font-bold tabular-nums">{n}</span>
              <span className="mt-2 text-sm tabular-nums text-muted-foreground">
                {s?.live ? (
                  <span className="font-semibold text-brand-accent">In progress</span>
                ) : taken ? (
                  <>
                    <span className="font-semibold text-foreground">
                      {s.best ?? 0}/{m.itemCount}
                    </span>{' '}
                    best
                  </>
                ) : (
                  'Not taken'
                )}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
