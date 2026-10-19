import type { Metadata } from 'next';
import { getActingAcademy } from '@/lib/auth/acting-server.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadQueue } from '@/lib/review/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { ReviewIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';
import { ReviewQueue } from '@/ui/review/ReviewQueue.tsx';

export const metadata: Metadata = { title: 'Review queue' };

/**
 * PPDT and TAT attempts sent for review (D34, D36). Staff see their academy's; the owner
 * sees candidates with no academy, and the academy they picked (D25).
 */
export default async function ReviewPage() {
  const viewer = await requireViewerAt('/staff/review');
  const { acting } = await getActingAcademy(viewer);
  const rows = await loadQueue(await createSupabaseServer(), acting?.id ?? null);
  const waiting = rows.filter((r) => !r.reviewedAt).length;
  const lede = viewer.role === 'superadmin' ? `${acting ? acting.name : 'No academy picked'}, and candidates with no academy.` : 'PPDT and TAT sheets sent for marks.';

  return (
    <Page>
      <PageHeader title={waiting ? `Review queue · ${waiting}` : 'Review queue'} lede={lede} />
      {rows.length === 0 ? <EmptyState icon={<ReviewIcon />} title="Nothing sent for review yet." /> : <ReviewQueue rows={rows} />}
    </Page>
  );
}
