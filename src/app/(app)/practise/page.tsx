import type { Metadata } from 'next';
import Link from 'next/link';
import { SSB_DAYS, entriesForDay } from '@/ui/catalog.ts';
import type { CatalogEntry } from '@/ui/catalog.ts';
import { Page, PageHeader, StatusBadge } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Practise' };

/** "WAT" where candidates say it; otherwise initials, or the first letters of a one-word name. */
function monogram(entry: CatalogEntry): string {
  if (entry.short) return entry.short;
  const words = entry.name.split(' ');
  return words.length > 1 ? words.map((w) => w[0]).join('') : entry.name.slice(0, 3).toUpperCase();
}

function EntryCard({ entry }: { entry: CatalogEntry }) {
  const ready = entry.availability === 'ready';
  const lit = ready || Boolean(entry.practice);
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`grid size-14 shrink-0 place-items-center rounded-xl text-sm font-bold tracking-wide ${
          lit ? 'bg-gradient-to-br from-brand to-navy text-white shadow-[0_8px_20px_-8px_rgb(29_78_216/0.6)]' : 'bg-secondary text-muted-foreground'
        }`}
      >
        {monogram(entry)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-snug">{entry.name}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{entry.summary}</span>
        <span className="mt-3 flex flex-wrap items-center gap-2">
          {entry.practice && (
            <span className="inline-flex items-center rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-accent ring-1 ring-brand/25">
              {entry.practice.label}
            </span>
          )}
          <StatusBadge availability={entry.availability} />
        </span>
      </span>
    </>
  );
  const href = ready ? `/run/${entry.instruments[0]}` : entry.practice?.href;
  return href ? (
    <Link href={href} className="lift flex h-full gap-4 rounded-xl border border-brand/30 bg-card p-4 shadow-card">
      {body}
    </Link>
  ) : (
    <div className="flex h-full gap-4 rounded-xl border bg-card/70 p-4">{body}</div>
  );
}

export default function PractisePage() {
  return (
    <Page>
      <PageHeader title="Practise" lede="Every test, on the day it happens." />

      <div className="space-y-12">
        {SSB_DAYS.map(({ day, title }) => {
          const entries = entriesForDay(day);
          const runnable = entries.filter((e) => e.availability !== 'not_simulated');
          const outdoor = entries.filter((e) => e.availability === 'not_simulated');
          return (
            <section key={day} id={`day-${day}`} aria-labelledby={`day-${day}-h`} className="rise scroll-mt-6">
              <div className="flex items-baseline gap-3">
                <span className="text-sm font-semibold tabular-nums text-brand-accent">{String(day).padStart(2, '0')}</span>
                <h2 id={`day-${day}-h`} className="text-xl font-bold tracking-tight">{title}</h2>
              </div>

              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {runnable.map((entry) => (
                  <li key={entry.id}><EntryCard entry={entry} /></li>
                ))}
              </ul>

              {outdoor.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    Outdoor tasks <StatusBadge availability="not_simulated" />
                  </span>
                  <ul className="flex flex-wrap gap-1.5">
                    {outdoor.map((e) => (
                      <li key={e.id} title={e.name} className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                        {e.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Page>
  );
}
