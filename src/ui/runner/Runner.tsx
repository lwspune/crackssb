'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { keyFor, reduce, resume, start } from '../../runner/engine.ts';
import type { EndedBy, RunnerEvent, RunnerState, Step } from '../../runner/engine.ts';
import type { RunnerInstrument } from '../../runner/modes.ts';
import { ArrowIcon } from '../icons.tsx';
import { RUNNABLE } from './registry.ts';
import type { RunnableInstrument } from './registry.ts';
import type { SessionStore } from './session-store.ts';

/**
 * The runner shell (UI.md §4): full screen, one thing visible, the deadline in
 * the corner, no way out but the clock or an abandon that costs the session.
 *
 * It owns nothing the engine does not tell it. Every render is the engine's
 * state; every save is the engine's `persist` effect; the item on screen is
 * the one the engine says the clock has reached. Built for forced sequence
 * (WAT) first — the other modes add a body, not a different shell.
 */

export interface RunnerContent {
  /** What the candidate sees for this item — the WAT word. Released per item by the engine. */
  stimulus(item: number): string;
}

interface Props {
  readonly instrument: RunnerInstrument;
  readonly title: string;
  readonly store: SessionStore;
  readonly content: RunnerContent;
}

type View =
  | { readonly kind: 'brief' }
  | { readonly kind: 'live'; readonly state: RunnerState }
  | { readonly kind: 'ended'; readonly endedBy: EndedBy; readonly saved: Readonly<Record<string, string>> };

const TICK_MS = 250;

function viewOf(state: RunnerState): View {
  return state.status === 'ended'
    ? { kind: 'ended', endedBy: state.endedBy ?? 'expiry', saved: state.saved }
    : { kind: 'live', state };
}

/**
 * Arrival, computed once on first render. A session already under way resumes
 * where the clock is, not where it was left; one that expired while the
 * candidate was away arrives ended. Reads storage, so the runner is client-only.
 */
function arrive(store: SessionStore, instrument: RunnerInstrument, config: RunnerState['config']): { view: View; step: Step | null } {
  const record = store.load(instrument);
  if (!record) return { view: { kind: 'brief' }, step: null };
  if (record.endedBy) return { view: { kind: 'ended', endedBy: record.endedBy, saved: record.saved }, step: null };
  const step = resume(config, record.startedAtMs, record.saved, Date.now());
  return { view: viewOf(step.state), step };
}

export function Runner({ instrument, title, store, content }: Props) {
  const runnable = RUNNABLE[instrument];
  if (!runnable) throw new Error(`"${instrument}" has no runner yet`);
  const { config } = runnable;

  const [arrival] = useState(() => arrive(store, instrument, config));
  const [view, setView] = useState<View>(arrival.view);
  const [confirming, setConfirming] = useState(false);
  const live = useRef<RunnerState | null>(arrival.view.kind === 'live' ? arrival.view.state : null);

  /** Write what the engine asked to be written. Storage only — no rendering. */
  const commit = useCallback(
    ({ state, effects }: Step) => {
      for (const effect of effects) {
        if (effect.type === 'persist') store.persist(instrument, effect.key, effect.text);
      }
      if (state.status === 'ended') store.finish(instrument, state.endedBy ?? 'expiry');
    },
    [instrument, store],
  );

  /** Carry out what the engine asked for, then show where it now is. */
  const apply = useCallback(
    (step: Step) => {
      commit(step);
      live.current = step.state.status === 'ended' ? null : step.state;
      if (step.state.status === 'ended') setConfirming(false);
      setView(viewOf(step.state));
    },
    [commit],
  );

  const dispatch = useCallback(
    (event: RunnerEvent) => {
      if (live.current) apply(reduce(live.current, event, Date.now()));
    },
    [apply],
  );

  // Catching up on arrival may have sealed items the candidate missed; save those seals.
  useEffect(() => {
    if (arrival.step) commit(arrival.step);
  }, [arrival, commit]);

  const isLive = view.kind === 'live';
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => dispatch({ type: 'tick' }), TICK_MS);
    return () => clearInterval(id);
  }, [isLive, dispatch]);

  const begin = () => {
    const record = store.create(instrument, Date.now());
    apply(start(config, record.startedAtMs, record.startedAtMs));
  };

  const restart = () => {
    store.clear(instrument);
    setView({ kind: 'brief' });
  };

  if (view.kind === 'brief') return <Brief title={title} facts={runnable.facts} instruction={runnable.instruction} onBegin={begin} />;
  if (view.kind === 'ended') {
    return <Ended title={title} endedBy={view.endedBy} saved={view.saved} itemCount={itemCountOf(config)} content={content} onRestart={restart} />;
  }

  const { state } = view;
  const item = state.currentItem;
  const key = keyFor(item, null);
  const remainingMs = state.position.status === 'live' ? state.position.remainingMs : 0;
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
  const perItem = config.mode === 'forced_sequence' ? config.secondsPerItem : 0;

  return (
    <LiveSequence
      title={title}
      item={item}
      word={content.stimulus(item)}
      text={state.saved[key] ?? ''}
      secondsLeft={secondsLeft}
      secondsPerItem={perItem}
      confirming={confirming}
      onType={(text) => dispatch({ type: 'input', text })}
      onAskAbandon={() => setConfirming(true)}
      onKeepGoing={() => setConfirming(false)}
      onAbandon={() => dispatch({ type: 'abandon' })}
    />
  );
}

function itemCountOf(config: RunnerState['config']): number {
  return 'itemCount' in config ? config.itemCount : 0;
}

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Brief — the last screen with a way out
// ---------------------------------------------------------------------------

interface BriefProps {
  title: string;
  facts: RunnableInstrument['facts'];
  instruction: string;
  onBegin: () => void;
}

function Brief({ title, facts, instruction, onBegin }: BriefProps) {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-runner text-runner-foreground">
      <div aria-hidden="true" className="absolute left-1/2 top-1/3 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-runner-ring/10 blur-3xl" />
      <div className="rise mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <p className="eyebrow text-runner-muted">Before you begin</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>

        <dl className="mt-10 grid grid-cols-3 divide-x divide-runner-track border-y border-runner-track">
          {facts.map((f) => (
            <div key={f.label} className="flex flex-col-reverse px-4 py-5 first:pl-0">
              <dt className="mt-1 text-xs text-runner-muted">{f.label}</dt>
              <dd className="text-4xl font-semibold tabular-nums tracking-tight sm:text-5xl">{f.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 text-lg">{instruction}</p>
        <p className="mt-2 text-sm text-runner-muted">The clock never pauses. Typed, not handwritten. Saved on this device.</p>

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={onBegin}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-runner-foreground px-7 text-base font-semibold text-runner shadow-[0_8px_30px_-6px_rgb(122_176_255/0.55)] transition hover:bg-white focus-visible:outline-runner-ring"
          >
            Begin <ArrowIcon />
          </button>
          <Link href="/practise" className="text-sm font-medium text-runner-muted underline-offset-4 hover:text-runner-foreground hover:underline focus-visible:outline-runner-ring">
            Not now
          </Link>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Live — forced sequence
// ---------------------------------------------------------------------------

interface LiveProps {
  title: string;
  item: number;
  word: string;
  text: string;
  secondsLeft: number;
  secondsPerItem: number;
  confirming: boolean;
  onType: (text: string) => void;
  onAskAbandon: () => void;
  onKeepGoing: () => void;
  onAbandon: () => void;
}

const WARN_AT = 5;

function LiveSequence(p: LiveProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const keepGoingRef = useRef<HTMLButtonElement>(null);
  const urgent = p.secondsLeft <= WARN_AT;

  // Each new word takes the cursor back to the field, so the keyboard never has to find it.
  useEffect(() => {
    if (!p.confirming) inputRef.current?.focus();
  }, [p.item, p.confirming]);

  useEffect(() => {
    if (p.confirming) keepGoingRef.current?.focus();
  }, [p.confirming]);

  const announcement = urgent ? `${WARN_AT} seconds left` : `New word: ${p.word}`;

  return (
    <main className="min-h-dvh bg-runner text-runner-foreground flex flex-col" data-runner>
      <h1 className="sr-only">{p.title}</h1>
      <div className="flex items-center justify-between px-4 pt-5 sm:px-8">
        <p className="eyebrow text-runner-muted">{p.title}</p>
        <p
          role="timer"
          aria-label="Time left for this word"
          className={`text-2xl font-semibold tabular-nums tracking-tight ${urgent ? 'text-runner-warn' : 'text-runner-foreground'}`}
        >
          {formatClock(p.secondsLeft)}
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 pb-10 sm:px-6">
        <p className="text-center text-5xl font-semibold uppercase tracking-[0.08em] sm:text-6xl" lang="en">
          {p.word}
        </p>
        <div aria-hidden="true" className="mx-auto mt-6 h-0.5 w-10 rounded-full bg-brand" />

        <label htmlFor="runner-input" className="eyebrow mt-16 block text-runner-muted">
          Your sentence
        </label>
        <input
          ref={inputRef}
          id="runner-input"
          type="text"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          value={p.text}
          disabled={p.confirming}
          onChange={(e) => p.onType(e.target.value)}
          className="mt-2 w-full border-0 border-b-2 border-runner-track bg-transparent py-3 text-lg text-runner-foreground placeholder:text-runner-muted focus:border-runner-ring focus:outline-none focus-visible:outline-none disabled:opacity-60"
          placeholder="Write the first thought"
        />
        <p className="mt-3 text-sm text-runner-muted">Saved as you type.</p>
      </div>

      <div aria-hidden="true" className="mx-auto flex w-full max-w-xl items-end justify-between px-4 pb-5 sm:px-6">
        {Array.from({ length: p.secondsPerItem }, (_, k) => (
          <span
            key={k}
            className={`w-1 rounded-sm transition-colors duration-300 ${k % 5 === 4 ? 'h-5' : 'h-3'} ${
              k < p.secondsLeft ? (urgent ? 'bg-runner-warn' : 'bg-runner-foreground') : 'bg-runner-track'
            }`}
          />
        ))}
      </div>

      <div className="flex justify-center px-4 pb-7">
        {p.confirming ? (
          <div role="dialog" aria-labelledby="abandon-title" aria-describedby="abandon-body" className="w-full max-w-md rounded-lg border border-runner-track p-4">
            <p id="abandon-title" className="font-semibold">End the test now?</p>
            <p id="abandon-body" className="mt-1 text-sm text-runner-muted">
              The clock is still running. Your answers are kept.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                ref={keepGoingRef}
                type="button"
                onClick={p.onKeepGoing}
                className="min-h-11 rounded-lg bg-runner-foreground px-4 text-sm font-semibold text-runner focus-visible:outline-runner-ring"
              >
                Keep going
              </button>
              <button
                type="button"
                onClick={p.onAbandon}
                className="min-h-11 rounded-lg border border-runner-muted px-4 text-sm font-semibold text-runner-foreground focus-visible:outline-runner-ring"
              >
                End the test
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={p.onAskAbandon}
            className="min-h-11 rounded-lg px-4 text-xs font-semibold uppercase tracking-[0.14em] text-runner-muted hover:text-runner-foreground focus-visible:outline-runner-ring"
          >
            Abandon session
          </button>
        )}
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Ended — back on the app's ground: the feedback surface is generous
// ---------------------------------------------------------------------------

const ENDED_HEADING: Readonly<Record<EndedBy, string>> = {
  expiry: 'Time is up',
  submit: 'Submitted',
  abandon: 'Session ended',
};

interface EndedProps {
  title: string;
  endedBy: EndedBy;
  saved: Readonly<Record<string, string>>;
  itemCount: number;
  content: RunnerContent;
  onRestart: () => void;
}

function Ended({ title, endedBy, saved, itemCount, content, onRestart }: EndedProps) {
  const rows = Array.from({ length: itemCount }, (_, item) => ({ item, word: content.stimulus(item), text: (saved[keyFor(item, null)] ?? '').trim() }));
  const answered = rows.filter((r) => r.text !== '').length;

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <section data-surface="navy" className="rise relative isolate overflow-hidden rounded-2xl bg-navy p-6 text-navy-foreground shadow-lift sm:p-8">
          <div aria-hidden="true" className="absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-navy-accent/20 blur-3xl" />
          <p className="eyebrow text-navy-accent">{title}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{ENDED_HEADING[endedBy]}</h1>
          <dl className="mt-6 flex gap-8">
            <div className="flex flex-col-reverse">
              <dt className="text-xs text-navy-muted">Written</dt>
              <dd className="text-3xl font-semibold tabular-nums">{answered}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="text-xs text-navy-muted">Blank</dt>
              <dd className="text-3xl font-semibold tabular-nums">{itemCount - answered}</dd>
            </div>
          </dl>
          <p className="mt-6 text-sm text-navy-muted">No debrief yet — scoring isn&rsquo;t switched on.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/practise" className="inline-flex min-h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-navy hover:bg-navy-foreground">
              Back to Practise
            </Link>
            <button type="button" onClick={onRestart} className="inline-flex min-h-11 items-center rounded-lg px-5 text-sm font-semibold text-navy-foreground ring-1 ring-navy-border hover:bg-white/10">
              Start a new session
            </button>
          </div>
        </section>

        <h2 className="mt-10 text-lg font-semibold">Your responses</h2>
        <ol className="mt-4 divide-y overflow-hidden rounded-xl border bg-card shadow-card">
          {rows.map((r) => (
            <li key={r.item} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-4 px-4 py-3 text-sm sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
              <span className="font-semibold uppercase tracking-wide">{r.word}</span>
              {r.text ? <span className="font-serif text-base">{r.text}</span> : <span className="italic text-muted-foreground">Blank</span>}
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
