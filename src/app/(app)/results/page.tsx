import type { Metadata } from 'next';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadAttempts, loadMocks } from '@/lib/mocks/data.ts';
import { loadPpdtAttempts } from '@/lib/ppdt/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { ResultsIcon } from '@/ui/icons.tsx';
import { AttemptList } from '@/ui/mock/AttemptList.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';
import { PpdtAttemptList } from '@/ui/ppdt/PpdtAttemptList.tsx';

export const metadata: Metadata = { title: 'Results' };

/** The viewer's results: OIR mocks (D32) and PPDT pictures (D33), newest first. */
export default async function ResultsPage() {
  const viewer = await requireViewerAt('/results');
  const client = await createSupabaseServer();
  const [attempts, mocks, ppdt] = await Promise.all([loadAttempts(client), loadMocks(client), loadPpdtAttempts(client, viewer.id)]);
  return (
    <Page>
      <PageHeader title="Results" lede="Everything you have taken, newest first." />
      {attempts.length === 0 && ppdt.length === 0 ? (
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
        </div>
      )}
    </Page>
  );
}
