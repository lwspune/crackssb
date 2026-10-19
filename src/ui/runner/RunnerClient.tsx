'use client';

import { useState } from 'react';
import type { RunnerInstrument } from '../../runner/modes.ts';
import { createSupabaseBrowser } from '../../lib/supabase/browser.ts';
import { WAT_CONTENT } from './content.ts';
import { Runner } from './Runner.tsx';
import type { RunnerContent } from './Runner.tsx';
import { createServerStore } from './server-store.ts';
import type { ServerRecord } from './server-store.ts';
import { supabaseSessionApi } from './supabase-api.ts';

const CONTENT: Partial<Record<RunnerInstrument, RunnerContent>> = { wat: WAT_CONTENT };

interface Props {
  instrument: RunnerInstrument;
  title: string;
  /** The live session the server found for this candidate, if any. */
  initial: ServerRecord | null;
  /** The server's clock when the page was rendered — the first estimate of the offset. */
  serverNowMs: number;
}

/** Binds the runner to the server: its clock, its record, its rules (Sprint 1). */
export function RunnerClient({ instrument, title, initial, serverNowMs }: Props) {
  const [store] = useState(() => createServerStore(supabaseSessionApi(createSupabaseBrowser()), { initial, serverNowMs }));
  const content = CONTENT[instrument];
  if (!content) throw new Error(`No content source for "${instrument}"`);
  return <Runner instrument={instrument} title={title} store={store} content={content} photoHref={(record) => `/results/${instrument}/${(record as ServerRecord).id}`} />;
}
