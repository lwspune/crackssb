'use client';

import { useState } from 'react';
import type { RunnerInstrument } from '../../runner/modes.ts';
import { WAT_CONTENT } from './content.ts';
import { Runner } from './Runner.tsx';
import type { RunnerContent } from './Runner.tsx';
import { createLocalStore, createMemoryStore } from './session-store.ts';
import type { SessionStore } from './session-store.ts';

const CONTENT: Partial<Record<RunnerInstrument, RunnerContent>> = { wat: WAT_CONTENT };

function deviceStore(): SessionStore {
  try {
    return createLocalStore(window.localStorage);
  } catch {
    // Storage blocked: the session still runs, it just cannot survive a reload.
    return createMemoryStore();
  }
}

/** Binds the runner to this device's storage. Sprint 1 swaps the store for the server's. */
export function RunnerClient({ instrument, title }: { instrument: RunnerInstrument; title: string }) {
  const [store] = useState(deviceStore);
  const content = CONTENT[instrument];
  if (!content) throw new Error(`No content source for "${instrument}"`);
  return <Runner instrument={instrument} title={title} store={store} content={content} />;
}
