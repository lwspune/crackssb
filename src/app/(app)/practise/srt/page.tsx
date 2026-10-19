import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadPaperAttempts, loadSrtSets } from '@/lib/paper/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { pictureStandings } from '@/ppdt/attempts.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { SetList } from '@/ui/tat/SetList.tsx';

export const metadata: Metadata = { title: 'SRT practice' };

/** SRT (D39, D38): the sets, any one any time, on paper, with where the viewer stands on each. */
export default async function SrtPracticePage() {
  const viewer = await requireViewerAt('/practise/srt');
  const client = await createSupabaseServer();
  const [sets, attempts] = await Promise.all([loadSrtSets(client), loadPaperAttempts(client, viewer.id, 'srt')]);

  return (
    <Page>
      <Link href="/practise" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Practise</Link>
      <PageHeader title="SRT practice" lede="60 situations · 30 minutes · on paper. Photograph the sheet after." />
      <SetList base="srt" sets={sets.map((s) => ({ id: s.id, title: s.title, detail: `${s.situations.length} situations · 30 min` }))} standing={pictureStandings(attempts)} />
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-dashed px-4 py-3">
        <span className="text-sm font-semibold">Print before you begin</span>
        <Link href="/sheets/srt" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">Print the sheet</Link>
        <a href="/srt-sheet.pdf" download className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">Download PDF</a>
      </div>
    </Page>
  );
}
