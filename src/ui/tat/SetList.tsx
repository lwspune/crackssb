import Link from 'next/link';
import type { PictureStanding } from '../../ppdt/attempts.ts';
import type { TatSetMeta } from './TatRunner.tsx';

/**
 * The TAT sets (D36), by name only: never a picture or its title, which would
 * spoil the 30 seconds. Each says where the viewer stands, and a tried one
 * links to its last result.
 */
export function SetList({ sets, standing }: { sets: readonly TatSetMeta[]; standing: ReadonlyMap<string, PictureStanding> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sets.map((s) => {
        const st = standing.get(s.id);
        const line = st?.live ? 'in progress' : st && st.tries > 0 ? `tried ${st.tries} time${st.tries === 1 ? '' : 's'}` : 'not tried';
        return (
          <li key={s.id} className="flex flex-col">
            <Link
              href={`/tat/${s.id}`}
              aria-label={`${s.title}, ${line}`}
              className={`lift flex flex-1 flex-col rounded-xl border bg-card p-5 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${st?.live ? 'border-brand-accent' : 'border-brand/30'}`}
            >
              <span className="text-lg font-bold">{s.title}</span>
              <span className="mt-1 text-sm text-muted-foreground">{s.slides.length - 1} pictures and a blank · 54 min</span>
              <span className={`mt-2 text-sm ${st?.live ? 'font-semibold text-brand-accent' : 'text-muted-foreground'}`}>
                {st?.live ? 'In progress' : st && st.tries > 0 ? `Tried ${st.tries}×` : 'Not tried'}
              </span>
            </Link>
            {st?.last && (
              <Link
                href={`/results/tat/${st.last}`}
                aria-label={`Last result for ${s.title}`}
                className="inline-flex min-h-11 items-center px-1 text-sm font-semibold text-brand-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              >
                Last result
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
