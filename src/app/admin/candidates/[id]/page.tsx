import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadMockAttemptsOf } from '@/lib/admin/candidates.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadMocks } from '@/lib/mocks/data.ts';
import { loadPaperAttempts } from '@/lib/paper/data.ts';
import { loadPpdtAttempts } from '@/lib/ppdt/data.ts';
import { loadOirIndex, loadOwnAnswers } from '@/lib/practice/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { loadTatAttempts } from '@/lib/tat/data.ts';
import { loadWatAttempts } from '@/lib/wat/data.ts';
import { OIR_CHAPTERS } from '@/oir/chapters.ts';
import { chapterProgress } from '@/oir/practice.ts';
import { SETS as SRT_SETS } from '@/srt/situations.ts';
import { SETS as TAT_SETS } from '@/tat/sets.ts';
import { ResultsIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';
import { AttemptRows } from '@/ui/results/AttemptRows.tsx';
import type { AttemptRow } from '@/ui/results/AttemptRows.tsx';

export const metadata: Metadata = { title: 'Candidate' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const SET_TITLE = new Map([...TAT_SETS, ...SRT_SETS].map((s) => [s.id, s.title]));

interface Over { sessionId: string; startedAt: string; over: boolean; input?: 'typed' | 'paper' }

/** A finished attempt opens its result; a running one is shown, not opened: its runner would start the owner's own attempt. */
function rows<T extends Over>(list: readonly T[], result: string, title: (a: T) => string, score?: (a: T) => string | undefined): AttemptRow[] {
  return list.map((a) => ({
    key: a.sessionId,
    href: a.over ? `/results/${result}/${a.sessionId}` : null,
    title: title(a),
    startedAt: a.startedAt,
    live: !a.over,
    paper: a.input === 'paper',
    ...(score ? { score: score(a) } : {}),
  }));
}

/** One candidate with no academy (D42): OIR practice, then every attempt by test, each opening its result. The owner's view only. */
export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireViewerAt(`/admin/candidates/${id}`);
  if (!UUID.test(id)) notFound();

  const client = await createSupabaseServer();
  const { data: p } = await client.from('profiles').select('full_name, email, role, org_id, joined_via, created_at, deactivated_at').eq('id', id).maybeSingle();
  if (!p || p.role !== 'candidate' || p.org_id !== null) notFound();

  const [index, answers, mocks, mockAttempts, ppdt, tat, wat, srt, sdt] = await Promise.all([
    loadOirIndex(client),
    loadOwnAnswers(client, id),
    loadMocks(client),
    loadMockAttemptsOf(client, id),
    loadPpdtAttempts(client, id),
    loadTatAttempts(client, id),
    loadWatAttempts(client, id),
    loadPaperAttempts(client, id, 'srt'),
    loadPaperAttempts(client, id, 'sdt'),
  ]);

  const practised = OIR_CHAPTERS.map((chapter) => ({
    chapter,
    progress: chapterProgress(index.filter((i) => i.reasoningType === chapter.reasoningType).map((i) => i.id), answers),
  })).filter((c) => c.progress.answered > 0);

  const meta = new Map(mocks.map((m) => [m.id, m]));
  const sections: { id: string; title: string; rows: AttemptRow[] }[] = [
    { id: 'oir', title: 'OIR mocks', rows: rows(mockAttempts, 'mock', (a) => meta.get(a.testId)?.title ?? 'Mock', (a) => (a.over ? `${a.correct ?? 0}/${meta.get(a.testId)?.itemCount ?? 40}` : undefined)) },
    { id: 'ppdt', title: 'PPDT', rows: rows(ppdt, 'ppdt', (a) => `Picture ${Number(a.itemId.slice(-2))}`) },
    { id: 'tat', title: 'TAT', rows: rows(tat, 'tat', (a) => SET_TITLE.get(a.itemId) ?? 'TAT') },
    { id: 'wat', title: 'WAT', rows: rows(wat, 'wat', () => 'WAT') },
    { id: 'srt', title: 'SRT', rows: rows(srt, 'srt', (a) => SET_TITLE.get(a.itemId) ?? 'SRT') },
    { id: 'sdt', title: 'SDT', rows: rows(sdt, 'sdt', () => 'SDT') },
  ].filter((s) => s.rows.length > 0);

  const lede = [p.email, `joined ${day.format(new Date(p.created_at))}`, p.joined_via === 'google' ? 'with Google' : 'login made by you'].filter(Boolean).join(' · ');

  return (
    <Page>
      <Link href="/admin/candidates" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Candidates</Link>
      <PageHeader title={p.full_name} lede={lede} />
      {p.deactivated_at && (
        <p className="-mt-4 mb-6">
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">Switched off</span>
        </p>
      )}

      <div className="max-w-2xl space-y-8">
        {practised.length > 0 && (
          <section aria-labelledby="practice-h">
            <h2 id="practice-h" className="mb-3 text-lg font-bold">OIR practice</h2>
            <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
              {practised.map(({ chapter, progress }) => (
                <li key={chapter.slug} className="flex min-h-14 items-center justify-between gap-4 px-5 py-3">
                  <span className="min-w-0 truncate font-semibold">{chapter.title}</span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {progress.answered}/{progress.total} answered · <span className="font-semibold text-foreground">{progress.right}</span> right
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {sections.map((s) => (
          <section key={s.id} aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`} className="mb-3 text-lg font-bold">{s.title}</h2>
            <AttemptRows rows={s.rows} />
          </section>
        ))}

        {practised.length === 0 && sections.length === 0 && <EmptyState icon={<ResultsIcon />} title="Nothing taken yet." />}
      </div>
    </Page>
  );
}
