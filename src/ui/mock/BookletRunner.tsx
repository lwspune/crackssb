'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { OPTION_LABELS } from '@/items/bank.ts';
import type { OptionLabel } from '@/items/bank.ts';
import { keyFor, reduce, resume } from '@/runner/engine.ts';
import type { RunnerEvent, RunnerState, Step } from '@/runner/engine.ts';
import type { RunnerConfig } from '@/runner/modes.ts';
import { ArrowIcon } from '../icons.tsx';
import type { PracticeItem } from '../practice/PracticeRunner.tsx';
import { OptionButton, optionGridClass, QuestionBody } from '../practice/Question.tsx';
import type { SessionRecord, SessionStore } from '../runner/session-store.ts';

/**
 * An OIR mock (D32) in Booklet mode (UI.md §3.1): the whole booklet, keyless;
 * answers in any order, changed until submitted; one clock from the server
 * that never pauses; on expiry it submits whatever is saved. Nothing here
 * knows a key — the result comes from test_result once it is over.
 *
 * The engine (src/runner/engine.ts) keeps time and decides what is saved;
 * the store carries it to the server. Flags are this device's only (a note
 * to self, not an answer). Dark, like every runner (D20).
 */

export interface MockMeta {
  readonly id: string;
  readonly title: string;
  readonly itemCount: number;
  readonly timeLimitSeconds: number;
}

interface Props {
  readonly mock: MockMeta;
  /** In booklet order. */
  readonly items: readonly PracticeItem[];
  readonly store: SessionStore;
  /** Called once the attempt is over and saved; the app goes to the result. */
  readonly onDone: (record: SessionRecord) => void;
}

type View =
  | { readonly kind: 'brief' }
  | { readonly kind: 'other'; readonly testId: string }
  | { readonly kind: 'live'; readonly state: RunnerState }
  | { readonly kind: 'ending'; readonly endedBy: 'submit' | 'expiry' | 'abandon' };

const INSTRUMENT = 'oir';
const TICK_MS = 250;
const WARN_SECONDS = 60;

const configOf = (mock: MockMeta): RunnerConfig => ({ mode: 'booklet', itemCount: mock.itemCount, timeLimitSeconds: mock.timeLimitSeconds });
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Words for the codes start_test refuses with (0009). */
function startRefusal(code: string): string {
  if (code === 'consent_required') return 'A guardian has to consent before you can start a test. Ask your academy.';
  if (code === 'dob_required') return 'Your date of birth is missing. Ask your academy to add it.';
  if (code === 'not_a_candidate') return 'Your account is not set up yet. Ask your academy.';
  if (code === 'unknown_test' || code === 'test_incomplete') return 'This mock is not available. Pick another.';
  return 'Could not start. Check your connection and try again.';
}

function viewOf(step: Step): View {
  return step.state.status === 'ended' ? { kind: 'ending', endedBy: step.state.endedBy ?? 'expiry' } : { kind: 'live', state: step.state };
}

/** Where a reload lands: this mock under way, another mock under way, or the brief. */
function arrive(store: SessionStore, mock: MockMeta): { view: View; step: Step | null } {
  const record = store.load(INSTRUMENT);
  if (!record) return { view: { kind: 'brief' }, step: null };
  if (record.testId && record.testId !== mock.id) return { view: { kind: 'other', testId: record.testId }, step: null };
  if (record.endedBy) return { view: { kind: 'ending', endedBy: record.endedBy }, step: null };
  const step = resume(configOf(mock), record.startedAtMs, record.saved, Date.now() + store.clockOffsetMs());
  return { view: viewOf(step), step };
}

/** Flags live on this device only; storage may be refused (private windows), and the mock works without it. */
function loadFlags(key: string): Set<number> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}
function saveFlags(key: string, flags: Set<number>) {
  try {
    localStorage.setItem(key, JSON.stringify([...flags]));
  } catch {
    // Flags are a convenience; losing them loses nothing that counts.
  }
}

function typingIn(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function BookletRunner({ mock, items, store, onDone }: Props) {
  const config = configOf(mock);
  const [arrival] = useState(() => arrive(store, mock));
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
      if (step.state.status === 'ended') setConfirming(false);
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

  // Flags are keyed to this attempt, so a retake starts clean; read again whenever the attempt changes.
  const startedAtMs = view.kind === 'live' ? store.load(INSTRUMENT)?.startedAtMs : undefined;
  const flagKey = startedAtMs === undefined ? null : `oir-flags:${mock.id}:${startedAtMs}`;
  const [flagged, setFlagged] = useState<{ key: string | null; flags: Set<number> }>({ key: null, flags: new Set() });
  if (flagged.key !== flagKey) setFlagged({ key: flagKey, flags: flagKey ? loadFlags(flagKey) : new Set() });
  const flags = flagged.key === flagKey ? flagged.flags : new Set<number>();

  const isLive = view.kind === 'live';
  useEffect(() => {
    if (!isLive) return;
    const id = setInterval(() => dispatch({ type: 'tick' }), TICK_MS);
    return () => clearInterval(id);
  }, [isLive, dispatch]);

  // Over, and every answer has reached the server: on to the result.
  useEffect(() => {
    if (view.kind !== 'ending' || sync !== 'saved' || done.current) return;
    const record = store.load(INSTRUMENT);
    if (!record) return;
    done.current = true;
    onDone(record);
  }, [view.kind, sync, store, onDone]);

  const begin = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const record = await store.create(INSTRUMENT, { input: 'typed', code: null, testId: mock.id });
      if (record.testId && record.testId !== mock.id) {
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

  const state = view.kind === 'live' ? view.state : null;
  const current = state?.currentItem ?? 0;

  const choose = useCallback((label: OptionLabel | '') => dispatch({ type: 'input', text: label }), [dispatch]);
  const go = useCallback((item: number) => dispatch({ type: 'navigate', item }), [dispatch]);
  const toggleFlag = useCallback(() => {
    setFlagged((f) => {
      const next = new Set(f.flags);
      if (next.has(current)) next.delete(current);
      else next.add(current);
      if (f.key) saveFlags(f.key, next);
      return { key: f.key, flags: next };
    });
  }, [current]);

  useEffect(() => {
    if (!isLive || confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || typingIn(e.target)) return;
      const letter = e.key.toUpperCase();
      if ((OPTION_LABELS as readonly string[]).includes(letter)) {
        e.preventDefault();
        choose(letter as OptionLabel);
      } else if (e.key === 'ArrowRight' && current < mock.itemCount - 1) {
        e.preventDefault();
        go(current + 1);
      } else if (e.key === 'ArrowLeft' && current > 0) {
        e.preventDefault();
        go(current - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isLive, confirming, choose, go, current, mock.itemCount]);

  if (view.kind === 'brief') return <Brief mock={mock} starting={starting} error={startError} onBegin={begin} />;
  if (view.kind === 'other') return <OtherRunning testId={view.testId} />;
  if (view.kind === 'ending' || !state) return <Ending endedBy={view.kind === 'ending' ? view.endedBy : 'submit'} offline={sync === 'offline'} />;

  const answerOf = (i: number) => state.saved[keyFor(i, null)] ?? '';
  const answered = Array.from({ length: mock.itemCount }, (_, i) => answerOf(i) !== '');
  const unanswered = answered.filter((a) => !a).length;
  const secondsLeft = state.position.status === 'live' ? Math.max(0, Math.ceil(state.position.remainingMs / 1000)) : 0;

  return (
    <div className="dark">
      <main className="min-h-dvh bg-runner text-foreground">
        <Header
          title={mock.title}
          secondsLeft={secondsLeft}
          sync={sync}
          onSubmit={() => setConfirming(true)}
        />
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_19.5rem]">
          <QuestionPanel
            item={items[current]}
            index={current}
            total={mock.itemCount}
            chosen={answerOf(current)}
            flagged={flags.has(current)}
            onChoose={choose}
            onFlag={toggleFlag}
            onGo={go}
          />
          <Grid count={mock.itemCount} current={current} answered={answered} flags={flags} onGo={go} />
        </div>
        {confirming && (
          <ConfirmSubmit
            unanswered={unanswered}
            flagged={flags.size}
            onKeepGoing={() => setConfirming(false)}
            onSubmit={() => dispatch({ type: 'submit' })}
          />
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Brief({ mock, starting, error, onBegin }: { mock: MockMeta; starting: boolean; error: string | null; onBegin: () => void }) {
  const facts = [
    { value: String(mock.itemCount), label: 'Questions' },
    { value: `${Math.round(mock.timeLimitSeconds / 60)} min`, label: 'In all' },
    { value: 'Any', label: 'Order' },
  ];
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-runner text-runner-foreground">
      <div aria-hidden="true" className="absolute left-1/2 top-1/3 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-runner-ring/10 blur-3xl" />
      <div className="rise mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <p className="eyebrow text-runner-muted">Before you begin</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{mock.title}</h1>
        <dl className="mt-10 grid grid-cols-3 divide-x divide-runner-track border-y border-runner-track">
          {facts.map((f) => (
            <div key={f.label} className="flex flex-col-reverse px-4 py-5 first:pl-0">
              <dt className="mt-1 text-xs text-runner-muted">{f.label}</dt>
              <dd className="text-3xl font-semibold tabular-nums tracking-tight sm:text-5xl">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-lg">Answer in any order. Change an answer until you submit.</p>
        <p className="mt-3 text-sm text-runner-muted">The clock never pauses. Answers and the rule for each come after.</p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={onBegin}
            disabled={starting}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-runner-foreground px-7 text-base font-semibold text-runner shadow-[0_8px_30px_-6px_rgb(122_176_255/0.55)] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring disabled:opacity-60"
          >
            {starting ? 'Starting…' : <>Begin <ArrowIcon /></>}
          </button>
          <Link href="/practise/oir" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-runner-muted underline-offset-4 hover:text-runner-foreground hover:underline focus-visible:outline-runner-ring">
            Not now
          </Link>
        </div>
        {error && (
          <p role="alert" className="mt-5 rounded-lg bg-runner-warn/15 px-4 py-3 text-sm text-runner-foreground ring-1 ring-runner-warn/40">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

function OtherRunning({ testId }: { testId: string }) {
  return (
    <main className="flex min-h-dvh items-center bg-runner text-runner-foreground">
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold">Another mock is running</h1>
        <p className="mt-2 text-runner-muted">One at a time. Finish it, or let its clock run out, first.</p>
        <Link
          href={`/mock/${testId}`}
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-runner-foreground px-6 font-semibold text-runner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring"
        >
          Go to it <ArrowIcon />
        </Link>
      </div>
    </main>
  );
}

function Ending({ endedBy, offline }: { endedBy: string; offline: boolean }) {
  return (
    <main className="flex min-h-dvh items-center bg-runner text-runner-foreground" aria-busy="true">
      <div className="mx-auto w-full max-w-xl px-4 py-12 text-center sm:px-6">
        <h1 className="text-2xl font-bold">{endedBy === 'expiry' ? 'Time is up' : 'Submitted'}</h1>
        <p role="status" className="mt-2 text-runner-muted">
          {offline ? 'Saving your answers — waiting for the connection.' : 'Saving your answers…'}
        </p>
      </div>
    </main>
  );
}

function Header({ title, secondsLeft, sync, onSubmit }: { title: string; secondsLeft: number; sync: string; onSubmit: () => void }) {
  const urgent = secondsLeft <= WARN_SECONDS;
  return (
    <header className="sticky top-0 z-10 border-b border-runner-track bg-runner/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
        <span className={`text-xs ${sync === 'offline' ? 'text-runner-warn' : 'text-runner-muted'}`} aria-live="polite">
          {sync === 'offline' ? 'Offline — retrying' : sync === 'saving' ? 'Saving…' : 'Saved'}
        </span>
        <span
          role="timer"
          aria-label="Time left"
          className={`min-w-16 rounded-md px-2 py-1 text-center font-mono text-lg font-semibold tabular-nums ${urgent ? 'bg-runner-warn/20 text-runner-warn' : ''}`}
        >
          {clock(secondsLeft)}
        </span>
        <button
          type="button"
          onClick={onSubmit}
          className="inline-flex min-h-11 items-center rounded-lg bg-runner-foreground px-4 text-sm font-semibold text-runner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring"
        >
          Submit
        </button>
      </div>
    </header>
  );
}

interface QuestionProps {
  item: PracticeItem;
  index: number;
  total: number;
  chosen: string;
  flagged: boolean;
  onChoose: (label: OptionLabel | '') => void;
  onFlag: () => void;
  onGo: (item: number) => void;
}

function QuestionPanel({ item, index, total, chosen, flagged, onChoose, onFlag, onGo }: QuestionProps) {
  const stemRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  // Moving to another question takes focus to it, so a screen reader reads the new one.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    stemRef.current?.focus();
  }, [index]);

  return (
    <section className="rounded-xl border bg-card p-5 shadow-card sm:p-7" aria-label="Question">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow tabular-nums text-muted-foreground">Question {index + 1} of {total}</p>
        <button
          type="button"
          onClick={onFlag}
          aria-pressed={flagged}
          className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold ring-1 focus-visible:outline-2 focus-visible:outline-ring ${flagged ? 'bg-runner-warn/15 text-runner-warn ring-runner-warn/50' : 'text-muted-foreground ring-border hover:text-foreground'}`}
        >
          <span aria-hidden="true">⚑</span>
          {flagged ? 'Flagged' : 'Flag for review'}
        </button>
      </div>

      <QuestionBody item={item} stemRef={stemRef} />

      <div className={`mt-6 ${optionGridClass(item)}`} role="group" aria-label="Options">
        {OPTION_LABELS.map((label) => {
          const picked = chosen === label;
          return (
            <OptionButton
              key={label}
              item={item}
              label={label}
              pressed={picked}
              tone={picked ? 'border-brand ring-2 ring-brand' : 'border-border hover:border-brand/60'}
              badge={picked ? 'bg-brand text-brand-foreground' : 'bg-secondary text-secondary-foreground'}
              onClick={() => onChoose(label)}
            />
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onGo(index - 1)}
            disabled={index === 0}
            className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => onGo(index + 1)}
            disabled={index === total - 1}
            className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Next
          </button>
        </div>
        {chosen !== '' && (
          <button type="button" onClick={() => onChoose('')} className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
            Clear answer
          </button>
        )}
      </div>
    </section>
  );
}

function Grid({ count, current, answered, flags, onGo }: { count: number; current: number; answered: boolean[]; flags: Set<number>; onGo: (i: number) => void }) {
  const done = answered.filter(Boolean).length;
  return (
    <nav aria-label="Questions" className="self-start rounded-xl border bg-card p-4 shadow-card lg:sticky lg:top-20">
      <p className="text-sm font-semibold tabular-nums">
        {done} of {count} answered{flags.size > 0 ? ` · ${flags.size} flagged` : ''}
      </p>
      <ol className="mt-3 grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
        {Array.from({ length: count }, (_, i) => {
          const a = answered[i];
          const f = flags.has(i);
          const here = i === current;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onGo(i)}
                aria-label={`Question ${i + 1}, ${a ? 'answered' : 'not answered'}${f ? ', flagged' : ''}`}
                aria-current={here ? 'true' : undefined}
                className={`relative grid aspect-square min-h-11 w-full place-items-center rounded-md text-sm font-semibold tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring ${
                  a ? 'bg-brand text-brand-foreground' : 'bg-secondary text-secondary-foreground'
                } ${here ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card' : ''}`}
              >
                {i + 1}
                {f && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-runner-warn ring-2 ring-card" />}
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand" />Answered</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-runner-warn" />Flagged</span>
      </p>
    </nav>
  );
}

function ConfirmSubmit({ unanswered, flagged, onKeepGoing, onSubmit }: { unanswered: number; flagged: number; onKeepGoing: () => void; onSubmit: () => void }) {
  const keepRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    keepRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onKeepGoing();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKeepGoing]);

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4">
      <div role="alertdialog" aria-modal="true" aria-labelledby="submit-h" aria-describedby="submit-d" className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-card">
        <h2 id="submit-h" className="text-lg font-bold">Submit now?</h2>
        <p id="submit-d" className="mt-2 text-sm text-muted-foreground">
          {unanswered === 0 && flagged === 0 ? 'Every question is answered.' : `${unanswered} unanswered · ${flagged} flagged`}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button ref={keepRef} type="button" onClick={onKeepGoing} className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring">
            Keep going
          </button>
          <button type="button" onClick={onSubmit} className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Submit now
          </button>
        </div>
      </div>
    </div>
  );
}
