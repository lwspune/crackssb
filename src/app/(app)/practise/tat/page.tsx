import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { loadSets, loadTatAttempts } from '@/lib/tat/data.ts';
import { pictureStandings } from '@/ppdt/attempts.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { SetList } from '@/ui/tat/SetList.tsx';

export const metadata: Metadata = { title: 'TAT practice' };

/** TAT (D36, D38): the sets, any one any time, on paper, with where the viewer stands on each. */
export default async function TatPracticePage() {
  const viewer = await requireViewerAt('/practise/tat');
  const client = await createSupabaseServer();
  const [sets, attempts] = await Promise.all([loadSets(client), loadTatAttempts(client, viewer.id)]);

  return (
    <Page>
      <Link href="/practise" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Practise</Link>
      <PageHeader title="TAT practice" lede="12 slides · 30 s to look · 4 min to write each, on paper. Photograph the sheet after." />
      <SetList sets={sets} standing={pictureStandings(attempts)} />
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-dashed px-4 py-3">
        <span className="text-sm font-semibold">Print before you begin</span>
        <Link href="/sheets/tat" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">Print the sheet</Link>
        <a href="/tat-sheet.pdf" download className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">Download PDF</a>
      </div>
    </Page>
  );
}
