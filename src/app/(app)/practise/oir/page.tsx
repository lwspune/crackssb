import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadAttempts, loadMocks } from '@/lib/mocks/data.ts';
import { loadOirIndex, loadOwnAnswers } from '@/lib/practice/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { OIR_CHAPTERS } from '@/oir/chapters.ts';
import { standings } from '@/oir/mock-result.ts';
import { chapterProgress } from '@/oir/practice.ts';
import { ArrowIcon } from '@/ui/icons.tsx';
import { MockGrid } from '@/ui/mock/MockGrid.tsx';
import { Page, PageHeader } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'OIR practice' };

/** OIR: timed mocks (D32) with the viewer's best on each, then chapter practice (D26) with how far they have got. */
export default async function OirPracticePage() {
  const viewer = await requireViewerAt('/practise/oir');
  const client = await createSupabaseServer();
  const [index, answers, mocks, attempts] = await Promise.all([loadOirIndex(client), loadOwnAnswers(client, viewer.id), loadMocks(client), loadAttempts(client)]);

  const chapters = OIR_CHAPTERS.map((chapter) => {
    const ids = index.filter((i) => i.reasoningType === chapter.reasoningType).map((i) => i.id);
    return { chapter, progress: chapterProgress(ids, answers) };
  });

  return (
    <Page>
      <Link href="/practise" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Practise</Link>
      <PageHeader title="OIR practice" lede="Timed mocks, and every chapter untimed." />

      {mocks.length > 0 && (
        <section aria-labelledby="mocks-h" className="mb-10">
          <h2 id="mocks-h" className="text-lg font-bold">Timed mocks</h2>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">40 questions · 20 minutes · answers and rules after.</p>
          <MockGrid mocks={mocks} standing={standings(attempts)} />
        </section>
      )}

      <h2 className="mb-4 text-lg font-bold">Chapters</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {chapters.map(({ chapter, progress }) => {
          const done = progress.total === 0 ? 0 : Math.round((progress.answered / progress.total) * 100);
          return (
            <li key={chapter.slug}>
              <Link
                href={`/practise/oir/${chapter.slug}`}
                className="lift flex h-full flex-col rounded-xl border border-brand/30 bg-card p-5 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="text-lg font-bold">{chapter.title}</span>
                  <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                    {progress.answered}/{progress.total}
                  </span>
                </span>
                <span className="mt-1 text-sm text-muted-foreground">{chapter.summary}</span>
                <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${done}%` }} />
                </span>
                <span className="mt-3 flex items-center justify-between text-sm">
                  <span className="tabular-nums">
                    {progress.answered === 0 ? 'Not started' : `${progress.right} right · ${progress.wrong} to retry`}
                  </span>
                  <ArrowIcon width={16} height={16} className="text-brand-accent" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
