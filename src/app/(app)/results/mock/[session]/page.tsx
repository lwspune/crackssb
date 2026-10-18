import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadResult } from '@/lib/mocks/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { summarise } from '@/oir/mock-result.ts';
import { ArrowIcon } from '@/ui/icons.tsx';
import { MockReview } from '@/ui/mock/MockReview.tsx';
import type { ReviewFilter } from '@/ui/mock/MockReview.tsx';
import { Page } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Mock result' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FILTERS: readonly { key: ReviewFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'wrong', label: 'Wrong' },
  { key: 'skipped', label: 'Left blank' },
];
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * One finished mock (D32): the score, time used, accuracy by question type
 * (weakest first, each linked to its chapter), and every question with the
 * answer and its rule. Practice: no percentile, no band. Keys come only from
 * test_result, which refuses them while the clock runs (0009).
 */
export default async function MockResultPage({ params, searchParams }: { params: Promise<{ session: string }>; searchParams: Promise<{ show?: string }> }) {
  const { session } = await params;
  const { show: rawShow } = await searchParams;
  await requireViewerAt(`/results/mock/${session}`);
  if (!UUID.test(session)) notFound();

  const result = await loadResult(await createSupabaseServer(), session);
  if (result.kind === 'missing') notFound();
  if (result.kind === 'running') redirect(`/mock/${result.testId}`);

  const { mock, items, rows, secondsUsed } = result;
  const s = summarise(rows);
  const show: ReviewFilter = rawShow === 'wrong' || rawShow === 'skipped' ? rawShow : 'all';
  const counts: Record<ReviewFilter, number> = { all: s.total, wrong: s.wrong, skipped: s.skipped };

  return (
    <Page>
      <Link href="/results" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Results</Link>

      <header className="rise mb-8 mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">{mock.title}</p>
          <h1 className="mt-1 text-5xl font-bold tabular-nums tracking-tight">
            {s.correct}
            <span className="text-2xl text-muted-foreground"> / {s.total}</span>
          </h1>
          <p className="mt-2 text-sm tabular-nums text-muted-foreground">
            {s.wrong} wrong · {s.skipped} left blank · {clock(secondsUsed)} of {clock(mock.timeLimitSeconds)} used
          </p>
        </div>
        <Link
          href={`/mock/${mock.id}`}
          className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Retake <ArrowIcon width={16} height={16} />
        </Link>
      </header>

      <section aria-labelledby="types-h" className="mb-10">
        <h2 id="types-h" className="mb-3 text-lg font-bold">By question type</h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
          {s.byType.map((t) => {
            const pct = Math.round((t.correct / t.total) * 100);
            return (
              <li key={t.reasoningType} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <span className="min-w-0 flex-1 font-medium">{t.title}</span>
                <span className="w-24 text-right text-sm tabular-nums">
                  <span className="font-semibold">{t.correct}</span>
                  <span className="text-muted-foreground"> of {t.total}</span>
                </span>
                <span className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-secondary sm:block" aria-hidden="true">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </span>
                {t.slug && t.correct < t.total ? (
                  <Link
                    href={`/practise/oir/${t.slug}`}
                    aria-label={`Practise ${t.title}`}
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-accent hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    Practise <ArrowIcon width={14} height={14} />
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 w-[5.25rem] items-center text-sm text-muted-foreground">{t.correct === t.total ? 'All right' : ''}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="review-h">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-h" className="text-lg font-bold">Review</h2>
          <nav aria-label="Show" className="inline-flex rounded-lg border bg-secondary p-1">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key === 'all' ? `/results/mock/${session}` : `/results/mock/${session}?show=${f.key}`}
                aria-current={show === f.key ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-ring ${show === f.key ? 'bg-card shadow-card' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {f.label} {counts[f.key]}
              </Link>
            ))}
          </nav>
        </div>
        <MockReview items={items} rows={rows} show={show} />
      </section>
    </Page>
  );
}
