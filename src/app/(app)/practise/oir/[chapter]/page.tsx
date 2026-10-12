import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { answerPractice } from '@/app/actions/practice.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadChapterItems, loadOwnAnswers } from '@/lib/practice/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { chapterBySlug } from '@/oir/chapters.ts';
import { chapterProgress, pickSet, practiceQueue } from '@/oir/practice.ts';
import type { PracticeSet } from '@/oir/practice.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { PracticeRunner } from '@/ui/practice/PracticeRunner.tsx';

type Params = Promise<{ chapter: string }>;
type Search = Promise<{ set?: string | string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { chapter } = await params;
  return { title: chapterBySlug(chapter)?.title ?? 'OIR practice' };
}

const SET_LABEL: Readonly<Record<PracticeSet, string>> = { new: 'New', wrong: 'Retry wrong', all: 'All' };
const EMPTY: Readonly<Record<PracticeSet, string>> = {
  new: 'Every question answered.',
  wrong: 'Nothing to retry.',
  all: 'No questions in this chapter yet.',
};

/** One chapter, one question at a time (D26). `?set=` picks new, wrong or all. */
export default async function ChapterPracticePage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { chapter: slug } = await params;
  const viewer = await requireViewerAt(`/practise/oir/${slug}`);
  const chapter = chapterBySlug(slug);
  if (!chapter) notFound();

  const client = await createSupabaseServer();
  const [items, answers] = await Promise.all([loadChapterItems(client, chapter.reasoningType), loadOwnAnswers(client, viewer.id)]);
  const ids = items.map((i) => i.id);
  const progress = chapterProgress(ids, answers);
  const set = pickSet((await searchParams).set, progress);
  const queued = new Set(practiceQueue(ids, answers, set));
  const queue = items.filter((i) => queued.has(i.id));
  const counts: Readonly<Record<PracticeSet, number>> = { new: progress.total - progress.answered, wrong: progress.wrong, all: progress.total };

  return (
    <Page>
      <Link href="/practise/oir" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← OIR practice</Link>
      <PageHeader title={chapter.title} lede={`${progress.answered} of ${progress.total} answered · ${progress.right} right`} />

      <nav aria-label="Question set" className="-mt-4 mb-6 flex flex-wrap gap-2">
        {(Object.keys(SET_LABEL) as PracticeSet[]).map((s) => (
          <Link
            key={s}
            href={`/practise/oir/${chapter.slug}?set=${s}`}
            aria-current={s === set ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              s === set ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            {SET_LABEL[s]} <span className="tabular-nums opacity-80">{counts[s]}</span>
          </Link>
        ))}
      </nav>

      <div className="max-w-2xl">
        {queue.length > 0 ? (
          <PracticeRunner key={`${set}:${queue.length}:${queue[0].id}`} items={queue} answer={answerPractice} doneHref="/practise/oir" />
        ) : (
          <p className="rounded-xl border border-dashed bg-card/60 p-5 font-medium">{EMPTY[set]}</p>
        )}
      </div>
    </Page>
  );
}
