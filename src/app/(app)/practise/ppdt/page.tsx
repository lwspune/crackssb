import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { loadPictures, loadPpdtAttempts } from '@/lib/ppdt/data.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { pictureStandings } from '@/ppdt/attempts.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { PictureGrid } from '@/ui/ppdt/PictureGrid.tsx';

export const metadata: Metadata = { title: 'PPDT practice' };

/** PPDT (D33): the ten pictures, any one any time, with where the viewer stands on each. */
export default async function PpdtPracticePage() {
  const viewer = await requireViewerAt('/practise/ppdt');
  const client = await createSupabaseServer();
  const [pictures, attempts] = await Promise.all([loadPictures(client), loadPpdtAttempts(client, viewer.id)]);

  return (
    <Page>
      <Link href="/practise" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Practise</Link>
      <PageHeader title="PPDT practice" lede="30 s to look · 1 min to note · 4 min to write. Each picture shows once per try." />
      <PictureGrid pictures={pictures} standing={pictureStandings(attempts)} />
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-dashed px-4 py-3">
        <span className="text-sm font-semibold">Writing on paper?</span>
        <Link href="/sheets/ppdt" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">Print the sheet</Link>
        <a href="/ppdt-sheet.pdf" download className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">Download PDF</a>
      </div>
    </Page>
  );
}
