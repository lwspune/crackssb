import type { Metadata } from 'next';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadAttempts, loadMocks } from '@/lib/mocks/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { ResultsIcon } from '@/ui/icons.tsx';
import { AttemptList } from '@/ui/mock/AttemptList.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Results' };

/** The viewer's results: OIR mock attempts for now (D32); debriefs join them as they are built. */
export default async function ResultsPage() {
  await requireViewerAt('/results');
  const client = await createSupabaseServer();
  const [attempts, mocks] = await Promise.all([loadAttempts(client), loadMocks(client)]);
  return (
    <Page>
      <PageHeader title="Results" lede="Every mock you have taken, newest first." />
      {attempts.length > 0 ? (
        <div className="max-w-2xl">
          <AttemptList attempts={attempts} mocks={mocks} />
        </div>
      ) : (
        <EmptyState icon={<ResultsIcon />} title="No results yet." href="/practise/oir" action="Take a mock" />
      )}
    </Page>
  );
}
