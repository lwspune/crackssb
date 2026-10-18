import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { entryById } from '@/ui/catalog.ts';
import { isSessionCode } from '@/ui/runner/paper.ts';
import { RUNNABLE } from '@/ui/runner/registry.ts';
import { AnswerSheet } from '@/ui/sheet/AnswerSheet.tsx';
import { PpdtSheet } from '@/ui/sheet/PpdtSheet.tsx';
import { PrintButton } from '@/ui/sheet/PrintButton.tsx';

/** Printable answer sheet for paper mode (D22). Outside the app shell: it is made to be printed. */

type Params = Promise<{ instrument: string }>;
type Search = Promise<{ code?: string | string[] }>;

export const metadata: Metadata = { title: 'Answer sheet', robots: { index: false } };

export default async function SheetPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { instrument } = await params;
  const runnable = Object.hasOwn(RUNNABLE, instrument) ? RUNNABLE[instrument as keyof typeof RUNNABLE] : undefined;
  const entry = entryById(instrument);
  // A line-per-word sheet for forced sequence (WAT); PPDT has its own one-page layout (D33).
  const ppdt = instrument === 'ppdt';
  if (!runnable || !entry || (runnable.config.mode !== 'forced_sequence' && !ppdt)) notFound();
  const lines = 'itemCount' in runnable.config ? runnable.config.itemCount : 0;

  // Anything that is not a code we issued prints as an empty box, never as text.
  const raw = (await searchParams).code;
  const code = typeof raw === 'string' && isSessionCode(raw) ? raw : null;

  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:py-10">
      <div data-print-hide className="mx-auto mb-6 flex w-full max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Answer sheet</h1>
          <p className="text-sm text-muted-foreground">
            {ppdt ? 'A4, one page. Print a few before you begin.' : `A4, ${Math.ceil(lines / 30)} pages. Print before you begin.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={runnable.start ?? `/run/${instrument}`} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-brand-accent hover:underline">
            Back to the test
          </Link>
          <PrintButton />
        </div>
      </div>
      {ppdt ? (
        <PpdtSheet code={code} />
      ) : (
        <AnswerSheet title={entry.name} short={entry.short ?? entry.name} lines={lines} perPage={30} code={code} />
      )}
    </main>
  );
}
