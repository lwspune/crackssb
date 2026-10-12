import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { entryById } from '@/ui/catalog.ts';
import { RUNNABLE } from '@/ui/runner/registry.ts';
import { RunnerScreen } from '@/ui/runner/RunnerScreen.tsx';
import type { RunnerInstrument } from '@/runner/modes.ts';

/** The runner route sits outside the (app) group, so it renders with no shell (UI.md §4). */

type Params = Promise<{ instrument: string }>;

function runnable(id: string): id is RunnerInstrument {
  return Object.hasOwn(RUNNABLE, id);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { instrument } = await params;
  return { title: entryById(instrument)?.short ?? 'Test' };
}

export default async function RunPage({ params }: { params: Params }) {
  const { instrument } = await params;
  await requireViewerAt(`/run/${instrument}`);
  if (!runnable(instrument)) notFound();
  const title = entryById(instrument)?.name ?? instrument;
  return <RunnerScreen instrument={instrument} title={title} />;
}
