import type { Metadata } from 'next';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadAttempts, loadMocks } from '@/lib/mocks/data.ts';
import { loadPpdtAttempts } from '@/lib/ppdt/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { loadTatAttempts } from '@/lib/tat/data.ts';
import { loadWatAttempts } from '@/lib/wat/data.ts';
import { SETS } from '@/tat/sets.ts';
import { ResultsIcon } from '@/ui/icons.tsx';
import { AttemptList } from '@/ui/mock/AttemptList.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';
import { PpdtAttemptList } from '@/ui/ppdt/PpdtAttemptList.tsx';
import { AttemptRows } from '@/ui/results/AttemptRows.tsx';

export const metadata: Metadata = { title: 'Results' };

const SET_TITLE = new Map(SETS.map((s) => [s.id, s.title]));

/** The viewer's results: OIR mocks (D32), PPDT pictures (D33), TAT sets (D36) and WAT (D38), newest first. */
export default async function ResultsPage() {
  const viewer = await requireViewerAt('/results');
  const client = await createSupabaseServer();
  const [attempts, mocks, ppdt, tat, wat] = await Promise.all([
    loadAttempts(client),
    loadMocks(client),
    loadPpdtAttempts(client, viewer.id),
    loadTatAttempts(client, viewer.id),
    loadWatAttempts(client, viewer.id),
  ]);
  const none = attempts.length + ppdt.length + tat.length + wat.length === 0;
  return (
    <Page>
      <PageHeader title="Results" lede="Everything you have taken, newest first." />
      {none ? (
        <EmptyState icon={<ResultsIcon />} title="No results yet." href="/practise" action="Practise" />
      ) : (
        <div className="max-w-2xl space-y-8">
          {attempts.length > 0 && (
            <section aria-labelledby="oir-h">
              <h2 id="oir-h" className="mb-3 text-lg font-bold">OIR mocks</h2>
              <AttemptList attempts={attempts} mocks={mocks} />
            </section>
          )}
          {ppdt.length > 0 && (
            <section aria-labelledby="ppdt-h">
              <h2 id="ppdt-h" className="mb-3 text-lg font-bold">PPDT</h2>
              <PpdtAttemptList attempts={ppdt} />
            </section>
          )}
          {tat.length > 0 && (
            <section aria-labelledby="tat-h">
              <h2 id="tat-h" className="mb-3 text-lg font-bold">TAT</h2>
              <AttemptRows
                rows={tat.map((a) => ({
                  key: a.sessionId,
                  href: a.over ? `/results/tat/${a.sessionId}` : `/tat/${a.itemId}`,
                  title: SET_TITLE.get(a.itemId) ?? 'TAT',
                  startedAt: a.startedAt,
                  live: !a.over,
                  paper: a.input === 'paper',
                }))}
              />
            </section>
          )}
          {wat.length > 0 && (
            <section aria-labelledby="wat-h">
              <h2 id="wat-h" className="mb-3 text-lg font-bold">WAT</h2>
              <AttemptRows
                rows={wat.map((a) => ({
                  key: a.sessionId,
                  href: a.over ? `/results/wat/${a.sessionId}` : '/run/wat',
                  title: 'Word Association Test',
                  startedAt: a.startedAt,
                  live: !a.over,
                  paper: a.input === 'paper',
                }))}
              />
            </section>
          )}
        </div>
      )}
    </Page>
  );
}
