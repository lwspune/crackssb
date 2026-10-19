'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { reduce, resume } from '@/runner/engine.ts';
import type { RunnerEvent, RunnerState, Step } from '@/runner/engine.ts';
import { INSTRUMENT_CONFIGS } from '@/runner/modes.ts';
import { ArrowIcon } from '../icons.tsx';
import { sessionCode } from '../runner/paper.ts';
import type { SessionRecord, SessionStore } from '../runner/session-store.ts';

/**
 * SRT (D39) and SDT (D40) on paper (D38): the whole list to read, in any
 * order — sixty situations, or the five paragraphs — and one clock on the
 * server's time. The answers go on the sheet; the candidate can hand in
 * early, or the clock ends it, and the app goes to the result to photograph
 * the sheet. Dark, like every runner (D20).
 */

export interface PaperBooklet {
  readonly instrument: 'srt' | 'sdt';
  /** The set, for SRT; SDT has none. */
  readonly testId: string | null;
  readonly title: string;
  /** What is running: "SRT set 1", "SDT". */
  readonly heading: string;
  readonly facts: readonly { readonly value: string; readonly label: string }[];
  readonly instruction: string;
  readonly items: readonly string[];
  /** The printable sheet, without its code. */
  readonly sheet: string;
  /** Where "Not now" goes. */
  readonly back: string;
}

interface Props {
  readonly booklet: PaperBooklet;
  readonly store: SessionStore;
  /** Called once the attempt is over and saved; the app goes to the result. */
  readonly onDone: (record: SessionRecord) => void;
}

type View =
  | { readonly kind: 'brief' }
  | { readonly kind: 'other'; readonly testId: string }
  | { readonly kind: 'live'; readonly state: RunnerState }
  | { readonly kind: 'ending' };

const TICK_MS = 250;
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function startRefusal(code: string): string {
  if (code === 'consent_required') return 'A guardian has to consent before you can start a test. Ask your academy.';
  if (code === 'not_a_candidate') return 'Your account is not set up yet. Ask your academy.';
  if (code === 'unknown_test' || code === 'test_incomplete') return 'This set is not available. Pick another.';
  return 'Could not start. Check your connection and try again.';
}

const viewOf = (step: Step): View => (step.state.status === 'ended' ? { kind: 'ending' } : { kind: 'live', state: step.state });

function arrive(store: SessionStore, b: PaperBooklet): { view: View; step: Step | null } {
  const record = store.load(b.instrument);
  if (!record) return { view: { kind: 'brief' }, step: null };
  if (record.testId && record.testId !== b.testId) return { view: { kind: 'other', testId: record.testId }, step: null };
  if (record.endedBy) return { view: { kind: 'ending' }, step: null };
  const step = resume(INSTRUMENT_CONFIGS[b.instrument], record.startedAtMs, record.saved, Date.now() + store.clockOffsetMs());
  return { view: viewOf(step), step };
}

export function PaperBookletRunner({ booklet, store, onDone }: Props) {
  const config = INSTRUMENT_CONFIGS[booklet.instrument];
  const [arrival] = useState(() => arrive(store, booklet));
  const [view, setView] = useState<View>(arrival.view);
  const live = useRef<RunnerState | null>(arrival.view.kind === 'live' ? arrival.view.state : null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const done = useRef(false);
  const sync = useSyncExternalStore(store.subscribe, store.syncState, () => 'saved' as const);

  const commit = useCallback(
    ({ state, effects }: Step) => {
      for (const effect of effects) {
        if (effect.type === 'persist') store.persist(booklet.instrument, effect.key, effect.text, effect.final);
      }
      if (state.status === 'ended') store.finish(booklet.instrument, state.endedBy ?? 'expiry');
    },
    [store, booklet.instrument],
  );

  const apply = useCallback(
    (step: Step) => {
      commit(step);
      live.current = step.state.status === 'ended' ? null : step.state;
      setView(viewOf(step));
    },
    [commit],
  );

  const dispatch = useCallback(
    (event: RunnerEvent) => {
      if (live.current) apply(reduce(live.current, event, Date.now() + store.clockOffsetMs()));
    },
    [apply, store],
  );

  useEffect(() => {
    if (arrival.step) commit(arrival.step);
  }, [arrival, commit]);

  const isLive = view.kind === 'live';
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => dispatch({ type: 'tick' }), TICK_MS);
    return () => clearInterval(id);
  }, [isLive, dispatch]);

  useEffect(() => {
    if (view.kind !== 'ending' || sync !== 'saved' || done.current) return;
    const record = store.load(booklet.instrument);
    if (!record) return;
    done.current = true;
    onDone(record);
  }, [view.kind, sync, store, onDone, booklet.instrument]);

  const begin = async (code: string) => {
    setStarting(true);
    setStartError(null);
    try {
      const record = await store.create(booklet.instrument, { input: 'paper', code, testId: booklet.testId });
      if (record.testId && record.testId !== booklet.testId) {
        setView({ kind: 'other', testId: record.testId });
        return;
      }
      apply(resume(config, record.startedAtMs, record.saved, Date.now() + store.clockOffsetMs()));
    } catch (e) {
      setStartError(startRefusal((e as Error).message));
    } finally {
      setStarting(false);
    }
  };

  if (view.kind === 'brief') return <Brief booklet={booklet} starting={starting} error={startError} onBegin={begin} />;
  if (view.kind === 'other') return <OtherRunning href={`/${booklet.instrument}/${view.testId}`} />;
  if (view.kind === 'ending') return <Ending offline={sync === 'offline'} />;

  const remaining = view.state.position.status === 'live' ? view.state.position.remainingMs : 0;
  return (
    <div className="dark">
      <main className="flex min-h-dvh flex-col bg-runner text-foreground">
        <header className="sticky top-0 z-10 border-b border-runner-track bg-runner">
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
            <span className="min-w-0 flex-1 truncate font-semibold">{booklet.heading} · on your sheet</span>
            <span role="timer" aria-label="Time left" className={`min-w-20 rounded-md px-2 py-1 text-center font-mono text-lg font-semibold tabular-nums ${remaining <= 60_000 ? 'bg-runner-warn/20 text-runner-warn' : ''}`}>
              {clock(remaining)}
            </span>
          </div>
        </header>
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
          <p className="text-sm text-runner-muted">{booklet.instruction}</p>
          <ol className="mt-4 space-y-3">
            {booklet.items.map((text, i) => (
              <li key={i} className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2 text-lg leading-snug">
                <span className="text-right font-semibold tabular-nums text-runner-muted">{i + 1}</span>
                <span>{text}</span>
              </li>
            ))}
          </ol>
          <div className="mt-10 border-t border-runner-track pt-6">
            {confirming ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">Hand in now? The clock stops for good.</span>
                <button type="button" onClick={() => dispatch({ type: 'submit' })} className="inline-flex min-h-11 items-center rounded-lg bg-runner-foreground px-5 font-semibold text-runner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring">
                  Yes, hand in
                </button>
                <button type="button" onClick={() => setConfirming(false)} className="inline-flex min-h-11 items-center rounded-lg px-5 font-semibold ring-1 ring-runner-track focus-visible:outline-2 focus-visible:outline-runner-ring">
                  Keep going
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center rounded-lg px-5 font-semibold ring-1 ring-runner-track hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-runner-ring">
                I’ve finished — hand in
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Brief({ booklet, starting, error, onBegin }: { booklet: PaperBooklet; starting: boolean; error: string | null; onBegin: (code: string) => void }) {
  const [code] = useState(() => sessionCode(Math.random));
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-runner text-runner-foreground">
      <div aria-hidden="true" className="absolute left-1/2 top-1/3 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-runner-ring/10 blur-3xl" />
      <div className="rise mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <p className="eyebrow text-runner-muted">Before you begin</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{booklet.title}</h1>
        <dl className="mt-10 grid grid-cols-3 divide-x divide-runner-track border-y border-runner-track">
          {booklet.facts.map((f) => (
            <div key={f.label} className="flex flex-col-reverse px-4 py-5 first:pl-0">
              <dt className="mt-1 text-xs text-runner-muted">{f.label}</dt>
              <dd className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-lg">{booklet.instruction}</p>

        <div className="mt-8 rounded-lg bg-white/[0.04] p-4 ring-1 ring-runner-track">
          <p className="text-sm text-runner-muted">Write this code at the top of every page of your sheet:</p>
          <p data-testid="session-code" className="mt-1 font-mono text-3xl font-semibold tracking-[0.12em]">{code}</p>
          <p className="mt-3 flex flex-wrap gap-x-5 text-sm">
            <Link href={`${booklet.sheet}?code=${code}`} target="_blank" className="inline-flex min-h-11 items-center font-semibold text-runner-foreground underline underline-offset-4 focus-visible:outline-runner-ring">
              Print the sheet
            </Link>
            <a href={`/${booklet.instrument}-sheet.pdf`} download className="inline-flex min-h-11 items-center font-semibold text-runner-foreground underline underline-offset-4 focus-visible:outline-runner-ring">
              Download PDF
            </a>
          </p>
        </div>

        <p className="mt-6 text-sm text-runner-muted">The clock never pauses. Hand in early if you finish.</p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => onBegin(code)}
            disabled={starting}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-runner-foreground px-7 text-base font-semibold text-runner shadow-[0_8px_30px_-6px_rgb(122_176_255/0.55)] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring disabled:opacity-60"
          >
            {starting ? 'Starting…' : <>Begin <ArrowIcon /></>}
          </button>
          <Link href={booklet.back} className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-runner-muted underline-offset-4 hover:text-runner-foreground hover:underline focus-visible:outline-runner-ring">
            Not now
          </Link>
        </div>
        {error && <p role="alert" className="mt-5 rounded-lg bg-runner-warn/15 px-4 py-3 text-sm text-runner-foreground ring-1 ring-runner-warn/40">{error}</p>}
      </div>
    </main>
  );
}

function OtherRunning({ href }: { href: string }) {
  return (
    <main className="flex min-h-dvh items-center bg-runner text-runner-foreground">
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold">Another set is running</h1>
        <p className="mt-2 text-runner-muted">One at a time. Finish it, or let its clock run out, first.</p>
        <Link href={href} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-runner-foreground px-6 font-semibold text-runner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring">
          Go to it <ArrowIcon />
        </Link>
      </div>
    </main>
  );
}

function Ending({ offline }: { offline: boolean }) {
  return (
    <main className="flex min-h-dvh items-center bg-runner text-runner-foreground" aria-busy="true">
      <div className="mx-auto w-full max-w-xl px-4 py-12 text-center sm:px-6">
        <h1 className="text-2xl font-bold">Handed in</h1>
        <p role="status" className="mt-2 text-runner-muted">{offline ? 'Saving — waiting for the connection.' : 'Saving…'}</p>
      </div>
    </main>
  );
}
