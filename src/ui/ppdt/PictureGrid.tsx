import Link from 'next/link';
import type { PictureStanding } from '../../ppdt/attempts.ts';
import type { PpdtPictureMeta } from './PpdtRunner.tsx';

/**
 * The PPDT pictures (D33), by number and difficulty only. Never the picture
 * or its title: seeing either before the clock starts would spoil the 30
 * seconds. Each says where the viewer stands, and a tried one links to its
 * last result.
 */

const DIFFICULTY: Readonly<Record<PpdtPictureMeta['difficulty'], string>> = { clear: 'clear', hazy: 'hazy', ambiguous: 'very ambiguous' };

export function PictureGrid({ pictures, standing }: { pictures: readonly PpdtPictureMeta[]; standing: ReadonlyMap<string, PictureStanding> }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {pictures.map((p) => {
        const n = Number(p.id.slice(-2));
        const s = standing.get(p.id);
        const line = s?.live ? 'in progress' : s && s.tries > 0 ? `tried ${s.tries} time${s.tries === 1 ? '' : 's'}` : 'not tried';
        return (
          <li key={p.id} className="flex flex-col">
            <Link
              href={`/picture/${p.id}`}
              aria-label={`Picture ${n}, ${DIFFICULTY[p.difficulty]}, ${line}`}
              className={`lift flex flex-1 flex-col rounded-xl border bg-card p-4 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${s?.live ? 'border-brand-accent' : 'border-brand/30'}`}
            >
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Picture</span>
              <span className="text-2xl font-bold tabular-nums">{n}</span>
              <span className="mt-2 text-sm text-muted-foreground">{DIFFICULTY[p.difficulty]}</span>
              <span className={`mt-1 text-sm ${s?.live ? 'font-semibold text-brand-accent' : 'text-muted-foreground'}`}>
                {s?.live ? 'In progress' : s && s.tries > 0 ? `Tried ${s.tries}×` : 'Not tried'}
              </span>
            </Link>
            {s?.last && (
              <Link
                href={`/results/ppdt/${s.last}`}
                aria-label={`Last result for picture ${n}`}
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
