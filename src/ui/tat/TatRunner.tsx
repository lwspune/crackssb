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
 * TAT (D36) in Stimulus → write mode (UI.md §3.1), on paper (D38): twelve
 * slides back to back, each picture for 30 s and never again, then four
 * minutes to write its story on the sheet; the twelfth slide is blank. The
 * engine keeps time on the server's clock; the sheet takes the ink, and is
 * photographed on the result page. Dark, like every runner (D20).
 */

export interface TatSetMeta {
  readonly id: string;
  readonly title: string;
  /** Twelve, in order; the last has no image. */
  readonly slides: readonly { readonly id: string; readonly image: string | null; readonly title: string }[];
}

interface Props {
  readonly set: TatSetMeta;
  readonly store: SessionStore;
  /** Called once the set is over and saved; the app goes to the result. */
  readonly onDone: (record: SessionRecord) => void;
}

type View =
  | { readonly kind: 'brief' }
  | { readonly kind: 'other'; readonly testId: string }
  | { readonly kind: 'live'; readonly state: RunnerState }
  | { readonly kind: 'ending' };

const INSTRUMENT = 'tat';
const CONFIG = INSTRUMENT_CONFIGS.tat;
const TICK_MS = 250;
const SET_MINUTES = CONFIG.mode === 'stimulus_write' ? (CONFIG.itemCount * CONFIG.phases.reduce((t, p) => t + p.seconds, 0)) / 60 : 0;
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

function arrive(store: SessionStore, set: TatSetMeta): { view: View; step: Step | null } {
  const record = store.load(INSTRUMENT);
  if (!record) return { view: { kind: 'brief' }, step: null };
  if (record.testId && record.testId !== set.id) return { view: { kind: 'other', testId: record.testId }, step: null };
  if (record.endedBy) return { view: { kind: 'ending' }, step: null };
  const step = resume(CONFIG, record.startedAtMs, record.saved, Date.now() + store.clockOffsetMs());
  return { view: viewOf(step), step };
}

export function TatRunner({ set, store, onDone }: Props) {
  const [arrival] = useState(() => arrive(store, set));
  const [view, setView] = useState<View>(arrival.view);
  const live = useRef<RunnerState | null>(arrival.view.kind === 'live' ? arrival.view.state : null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const done = useRef(false);
  const sync = useSyncExternalStore(store.subscribe, store.syncState, () => 'saved' as const);

  const commit = useCallback(
    ({ state, effects }: Step) => {
      for (const effect of effects) {
        if (effect.type === 'persist') store.persist(INSTRUMENT, effect.key, effect.text, effect.final);
      }
      if (state.status === 'ended') store.finish(INSTRUMENT, state.endedBy ?? 'expiry');
    },
    [store],
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
    const record = store.load(INSTRUMENT);
    if (!record) return;
    done.current = true;
    onDone(record);
  }, [view.kind, sync, store, onDone]);

  const begin = async (code: string) => {
    setStarting(true);
    setStartError(null);
    try {
      const record = await store.create(INSTRUMENT, { input: 'paper', code, testId: set.id });
      if (record.testId && record.testId !== set.id) {
        setView({ kind: 'other', testId: record.testId });
        return;
      }
      apply(resume(CONFIG, record.startedAtMs, record.saved, Date.now() + store.clockOffsetMs()));
    } catch (e) {
      setStartError(startRefusal((e as Error).message));
    } finally {
      setStarting(false);
    }
  };

  if (view.kind === 'brief') return <Brief starting={starting} error={startError} onBegin={begin} />;
  if (view.kind === 'other') return <OtherRunning testId={view.testId} />;
  if (view.kind === 'ending') return <Ending offline={sync === 'offline'} />;

  const position = view.state.position;
  const item = position.status === 'live' && position.item !== null ? position.item : view.state.currentItem;
  const phase = position.status === 'live' ? position.phase : null;
  const remaining = position.status === 'live' ? position.remainingMs : 0;
  const slide = set.slides[item];
  const n = item + 1;

  return (
    <div className="dark">
      <main className="flex min-h-dvh flex-col bg-runner text-foreground">
        <header className="border-b border-runner-track">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
            <span className="min-w-0 flex-1 truncate font-semibold">
              TAT · Slide {n} of {set.slides.length} · {phase === 'show' ? 'Look' : 'Write'}
            </span>
            <span role="timer" aria-label="Time left in this step" className={`min-w-16 rounded-md px-2 py-1 text-center font-mono text-lg font-semibold tabular-nums ${remaining <= 10_000 ? 'bg-runner-warn/20 text-runner-warn' : ''}`}>
              {clock(remaining)}
            </span>
          </div>
          <div aria-hidden="true" className="h-1 bg-runner-track">
            <div className="h-full bg-runner-ring transition-[width]" style={{ width: `${(item / set.slides.length) * 100}%` }} />
          </div>
        </header>
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
          {phase === 'show' &&
            (slide?.image ? (
              <figure className="flex flex-col items-center">
                {/* The picture is the test: its description would give it away, so the text says only what it is for. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.image} alt="The picture. Look for 30 seconds." className="max-h-[75dvh] w-auto max-w-full rounded-lg shadow-lift" />
                <figcaption className="mt-3 text-sm text-runner-muted">Look closely. It will not come back.</figcaption>
              </figure>
            ) : (
              <figure className="flex flex-col items-center">
                <div className="aspect-[4/3] w-full max-w-3xl rounded-lg bg-white shadow-lift" />
                <figcaption className="mt-3 text-sm text-runner-muted">Blank slide. Think of a story of your own.</figcaption>
              </figure>
            ))}
          {phase === 'write' && (
            <section className="mx-auto max-w-xl py-16 text-center">
              <p className="text-2xl font-semibold leading-snug">
                Write story {n} on your sheet{slide?.image ? ': what led to this, what is happening, how it ends.' : ': any story of your own.'}
              </p>
              <p className="mt-4 text-sm text-runner-muted">{n < set.slides.length ? 'The next picture comes when the time is up.' : 'The last one. Photograph your sheet after.'}</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Brief({ starting, error, onBegin }: { starting: boolean; error: string | null; onBegin: (code: string) => void }) {
  const [code] = useState(() => sessionCode(Math.random));
  const facts = [
    { value: '12', label: 'Slides' },
    { value: '30 s', label: 'Look' },
    { value: '4 min', label: 'Write' },
  ];
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-runner text-runner-foreground">
      <div aria-hidden="true" className="absolute left-1/2 top-1/3 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-runner-ring/10 blur-3xl" />
      <div className="rise mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <p className="eyebrow text-runner-muted">Before you begin</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Thematic Apperception</h1>
        <dl className="mt-10 grid grid-cols-3 divide-x divide-runner-track border-y border-runner-track">
          {facts.map((f) => (
            <div key={f.label} className="flex flex-col-reverse px-4 py-5 first:pl-0">
              <dt className="mt-1 text-xs text-runner-muted">{f.label}</dt>
              <dd className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-lg">A picture, then its story on your sheet. Twelve times; the last slide is blank.</p>

        <div className="mt-8 rounded-lg bg-white/[0.04] p-4 ring-1 ring-runner-track">
          <p className="text-sm text-runner-muted">Write this code at the top of every page of your sheet:</p>
          <p data-testid="session-code" className="mt-1 font-mono text-3xl font-semibold tracking-[0.12em]">{code}</p>
          <p className="mt-3 flex flex-wrap gap-x-5 text-sm">
            <Link href={`/sheets/tat?code=${code}`} target="_blank" className="inline-flex min-h-11 items-center font-semibold text-runner-foreground underline underline-offset-4 focus-visible:outline-runner-ring">
              Print the sheet
            </Link>
            <a href="/tat-sheet.pdf" download className="inline-flex min-h-11 items-center font-semibold text-runner-foreground underline underline-offset-4 focus-visible:outline-runner-ring">
              Download PDF
            </a>
          </p>
        </div>

        <p className="mt-6 text-sm text-runner-muted">{SET_MINUTES} minutes, and the clock never pauses. Each picture shows once.</p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => onBegin(code)}
            disabled={starting}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-runner-foreground px-7 text-base font-semibold text-runner shadow-[0_8px_30px_-6px_rgb(122_176_255/0.55)] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring disabled:opacity-60"
          >
            {starting ? 'Starting…' : <>Begin <ArrowIcon /></>}
          </button>
          <Link href="/practise/tat" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-runner-muted underline-offset-4 hover:text-runner-foreground hover:underline focus-visible:outline-runner-ring">
            Not now
          </Link>
        </div>
        {error && <p role="alert" className="mt-5 rounded-lg bg-runner-warn/15 px-4 py-3 text-sm text-runner-foreground ring-1 ring-runner-warn/40">{error}</p>}
      </div>
    </main>
  );
}

function OtherRunning({ testId }: { testId: string }) {
  return (
    <main className="flex min-h-dvh items-center bg-runner text-runner-foreground">
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold">Another set is running</h1>
        <p className="mt-2 text-runner-muted">One at a time. Finish it, or let its clock run out, first.</p>
        <Link href={`/tat/${testId}`} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-runner-foreground px-6 font-semibold text-runner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring">
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
        <h1 className="text-2xl font-bold">Time is up</h1>
        <p role="status" className="mt-2 text-runner-muted">{offline ? 'Saving — waiting for the connection.' : 'Saving…'}</p>
      </div>
    </main>
  );
}
