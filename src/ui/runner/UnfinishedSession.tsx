'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { buildSchedule } from '../../runner/schedule.ts';
import type { RunnerInstrument } from '../../runner/modes.ts';
import { entryById } from '../catalog.ts';
import { ArrowIcon } from '../icons.tsx';
import { RUNNABLE } from './registry.ts';
import { createLocalStore } from './session-store.ts';

/**
 * Home's "what is unfinished" (UI.md §5.1). A session the candidate walked
 * away from is still running — the clock never pauses — so Home says so
 * rather than letting them find out on return.
 */

type Found = `${RunnerInstrument}:${'running' | 'expired'}` | '';

/** A primitive snapshot, so React can compare it between reads. */
function snapshot(): Found {
  try {
    const store = createLocalStore(window.localStorage);
    for (const [instrument, runnable] of Object.entries(RUNNABLE)) {
      const record = store.load(instrument as RunnerInstrument);
      if (!runnable || !record || record.endedBy) continue;
      const { endMs } = buildSchedule(runnable.config, record.startedAtMs);
      return `${instrument as RunnerInstrument}:${endMs === null || Date.now() < endMs ? 'running' : 'expired'}`;
    }
  } catch {
    // Storage blocked: nothing can be unfinished.
  }
  return '';
}

function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

export function UnfinishedSession() {
  const found = useSyncExternalStore(subscribe, snapshot, () => '' as Found);
  if (!found) return null;

  const [instrument, state] = found.split(':') as [RunnerInstrument, 'running' | 'expired'];
  const running = state === 'running';
  const name = entryById(instrument)?.short ?? instrument;

  return (
    <Link
      href={`/run/${instrument}`}
      className="lift mb-6 flex items-center justify-between gap-4 rounded-xl border border-brand-accent/40 bg-accent px-5 py-4 text-accent-foreground"
    >
      <span>
        <span className="block font-semibold">
          {running ? `Your ${name} is still running` : `Your ${name} timed out while you were away`}
        </span>
        <span className="block text-sm text-muted-foreground">
          {running ? 'The clock did not stop.' : 'Your answers were kept.'}
        </span>
      </span>
      <ArrowIcon className="shrink-0 text-brand-accent" />
    </Link>
  );
}
