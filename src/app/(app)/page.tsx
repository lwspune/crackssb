import Link from 'next/link';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { SSB_DAYS, entriesForDay, nextUp } from '@/ui/catalog.ts';
import { ArrowIcon, OlqIcon, ResultsIcon } from '@/ui/icons.tsx';
import { Contours, EmptyState, Page } from '@/ui/parts.tsx';
import { RUNNABLE } from '@/ui/runner/registry.ts';
import { UnfinishedSession } from '@/ui/runner/UnfinishedSession.tsx';

/** The tests this viewer has a session for, by instrument: what "Next up" moves past (D38). */
async function taken(viewerId: string): Promise<Set<string>> {
  const client = await createSupabaseServer();
  const { data, error } = await client.from('sessions').select('assessment_type').eq('candidate_id', viewerId).limit(1000);
  if (error) console.error('loading taken tests failed', { code: error.code });
  return new Set((data ?? []).map((r) => r.assessment_type));
}

export default async function HomePage() {
  const viewer = await requireViewerAt('/');
  const next = nextUp(await taken(viewer.id));
  const runnable = next ? RUNNABLE[next.instruments[0]] : undefined;

  return (
    <Page>
      <UnfinishedSession />

      <section data-surface="navy" aria-labelledby="hero-h" className="rise relative isolate overflow-hidden rounded-2xl bg-navy p-6 text-navy-foreground shadow-lift sm:p-10">
        <Contours className="-right-24 -top-8 -z-10 w-[56rem] text-navy-border" />
        <div aria-hidden="true" className="absolute -right-32 -top-32 -z-10 size-96 rounded-full bg-navy-accent/20 blur-3xl" />

        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
          <div>
            <p className="eyebrow text-navy-accent">SSB preparation</p>
            <h1 id="hero-h" className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              Five days.
              <br />
              One clock.
            </h1>
            <p className="mt-4 text-navy-muted">Practised by day, on the real timer.</p>
          </div>

          {next && runnable && (
            <div className="rounded-xl bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur-sm sm:p-6">
              <p className="eyebrow text-navy-accent">Next up · Day {next.day}</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{next.name}</h2>
              <p className="mt-1 text-sm text-navy-muted">{next.summary}</p>
              <dl className="mt-5 grid grid-cols-3 divide-x divide-navy-border border-y border-navy-border">
                {runnable.facts.map((f) => (
                  <div key={f.label} className="flex flex-col-reverse px-3 py-3 first:pl-0">
                    <dt className="mt-0.5 text-xs text-navy-muted">{f.label}</dt>
                    <dd className="text-3xl font-semibold tabular-nums tracking-tight">{f.value}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href={runnable.start ?? `/run/${next.instruments[0]}`}
                className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white text-base font-semibold text-navy shadow-[0_8px_24px_-8px_rgb(122_176_255/0.6)] transition hover:bg-navy-foreground"
              >
                Begin {next.short ?? next.name} <ArrowIcon />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="days-h" className="rise mt-12 [animation-delay:80ms]">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="days-h" className="text-xl font-bold tracking-tight">The five days</h2>
          <Link href="/practise" className="-mr-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-brand-accent hover:underline">
            Practise <ArrowIcon width={16} height={16} />
          </Link>
        </div>
        <ol className="mt-6 grid md:grid-cols-5">
          {SSB_DAYS.map(({ day, title }, i) => {
            const entries = entriesForDay(day);
            const ready = entries.filter((e) => e.availability === 'ready').length;
            const last = i === SSB_DAYS.length - 1;
            return (
              <li key={day} className="relative">
                {!last && (
                  <span aria-hidden="true" className="absolute left-5 top-10 h-[calc(100%-2.5rem)] w-px bg-border md:left-10 md:top-5 md:h-px md:w-[calc(100%-2.5rem)]" />
                )}
                <Link href={`/practise#day-${day}`} className="group relative flex gap-4 pb-6 md:flex-col md:gap-3 md:pb-0 md:pr-4">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold tabular-nums transition ${
                      ready > 0
                        ? 'bg-brand text-brand-foreground ring-4 ring-brand/15'
                        : 'border bg-card text-muted-foreground group-hover:border-brand-accent/50'
                    }`}
                  >
                    {String(day).padStart(2, '0')}
                  </span>
                  <span className="pt-1.5 md:pt-0">
                    <span className="block font-semibold group-hover:text-brand-accent">{title}</span>
                    <span className="block text-sm text-muted-foreground">{ready > 0 ? `${ready} ready` : 'Coming'}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="rise mt-12 grid gap-4 [animation-delay:160ms] md:grid-cols-2">
        <EmptyState icon={<ResultsIcon />} title="No debriefs yet." href="/results" action="Results" />
        <EmptyState icon={<OlqIcon />} title="No OLQs observed yet." href="/olq" action="All 15" />
      </div>
    </Page>
  );
}
