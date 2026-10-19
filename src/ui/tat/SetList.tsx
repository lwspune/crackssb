import Link from 'next/link';
import type { PictureStanding } from '../../ppdt/attempts.ts';

/**
 * The sets of a test — TAT (D36), SRT (D39) — by name only: never a picture
 * or a situation, which would spoil the clock. Each says where the viewer
 * stands, and a tried one links to its last result.
 */
export interface SetRow {
  readonly id: string;
  readonly title: string;
  /** One line on what it holds: "11 pictures and a blank · 54 min". */
  readonly detail: string;
}

export function SetList({ base, sets, standing }: { base: 'tat' | 'srt'; sets: readonly SetRow[]; standing: ReadonlyMap<string, PictureStanding> }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sets.map((s) => {
        const st = standing.get(s.id);
        const line = st?.live ? 'in progress' : st && st.tries > 0 ? `tried ${st.tries} time${st.tries === 1 ? '' : 's'}` : 'not tried';
        return (
          <li key={s.id} className="flex flex-col">
            <Link
              href={`/${base}/${s.id}`}
              aria-label={`${s.title}, ${line}`}
              className={`lift flex flex-1 flex-col rounded-xl border bg-card p-5 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${st?.live ? 'border-brand-accent' : 'border-brand/30'}`}
            >
              <span className="text-lg font-bold">{s.title}</span>
              <span className="mt-1 text-sm text-muted-foreground">{s.detail}</span>
              <span className={`mt-2 text-sm ${st?.live ? 'font-semibold text-brand-accent' : 'text-muted-foreground'}`}>
                {st?.live ? 'In progress' : st && st.tries > 0 ? `Tried ${st.tries}×` : 'Not tried'}
              </span>
            </Link>
            {st?.last && (
              <Link
                href={`/results/${base}/${st.last}`}
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
