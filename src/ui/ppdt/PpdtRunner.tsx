'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { reduce, resume } from '@/runner/engine.ts';
import type { RunnerEvent, RunnerState, Step } from '@/runner/engine.ts';
import { INSTRUMENT_CONFIGS } from '@/runner/modes.ts';
import { MAX_ROWS, parseNote, serialiseNote, withCount } from '@/ppdt/note.ts';
import type { MoodMark, PpdtNote, Sex } from '@/ppdt/note.ts';
import { ArrowIcon } from '../icons.tsx';
import { OFFER_TYPED, sessionCode } from '../runner/paper.ts';
import type { InputMode, SessionRecord, SessionStore } from '../runner/session-store.ts';

/**
 * PPDT, written portion (D33), in Stimulus → write mode (UI.md §3.1): the
 * picture for 30 s and never again, the character box for a minute, the story
 * for four. The engine keeps time and decides what is saved; the store
 * carries it to the server, which takes each answer only in its own window
 * (0012). On paper (D22) the screen keeps time and the sheet takes the ink.
 * Dark, like every runner (D20).
 */

export interface PpdtPictureMeta {
  readonly id: string;
  readonly title: string;
  readonly image: string;
  readonly difficulty: 'clear' | 'hazy' | 'ambiguous';
}

interface Props {
  readonly picture: PpdtPictureMeta;
  readonly store: SessionStore;
  /** Called once the attempt is over and saved; the app goes to the result. */
  readonly onDone: (record: SessionRecord) => void;
  /** Offer typing as well as paper (D38: off in the app). */
  readonly offerTyped?: boolean;
}

type View =
  | { readonly kind: 'brief' }
  | { readonly kind: 'other'; readonly itemId: string }
  | { readonly kind: 'live'; readonly state: RunnerState }
  | { readonly kind: 'ending' };

const INSTRUMENT = 'ppdt';
const CONFIG = INSTRUMENT_CONFIGS.ppdt;
const TICK_MS = 250;
const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const words = (text: string) => (text.trim() === '' ? 0 : text.trim().split(/\s+/).length);

function startRefusal(code: string): string {
  if (code === 'consent_required') return 'A guardian has to consent before you can start a test. Ask your academy.';
  if (code === 'dob_required') return 'Your date of birth is missing. Ask your academy to add it.';
  if (code === 'not_a_candidate') return 'Your account is not set up yet. Ask your academy.';
  if (code === 'unknown_item') return 'This picture is not available. Pick another.';
  return 'Could not start. Check your connection and try again.';
}

const viewOf = (step: Step): View => (step.state.status === 'ended' ? { kind: 'ending' } : { kind: 'live', state: step.state });

function arrive(store: SessionStore, picture: PpdtPictureMeta): { view: View; step: Step | null; input: InputMode } {
  const record = store.load(INSTRUMENT);
  if (!record) return { view: { kind: 'brief' }, step: null, input: 'typed' };
  if (record.itemId && record.itemId !== picture.id) return { view: { kind: 'other', itemId: record.itemId }, step: null, input: record.input };
  if (record.endedBy) return { view: { kind: 'ending' }, step: null, input: record.input };
  const step = resume(CONFIG, record.startedAtMs, record.saved, Date.now() + store.clockOffsetMs());
  return { view: viewOf(step), step, input: record.input };
}

export function PpdtRunner({ picture, store, onDone, offerTyped = OFFER_TYPED }: Props) {
  const [arrival] = useState(() => arrive(store, picture));
  const [view, setView] = useState<View>(arrival.view);
  const [input, setInput] = useState<InputMode>(arrival.input);
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

  const begin = async (choice: { input: InputMode; code: string | null }) => {
    setStarting(true);
    setStartError(null);
    try {
      const record = await store.create(INSTRUMENT, { ...choice, itemId: picture.id });
      if (record.itemId && record.itemId !== picture.id) {
        setView({ kind: 'other', itemId: record.itemId });
        return;
      }
      setInput(record.input);
      apply(resume(CONFIG, record.startedAtMs, record.saved, Date.now() + store.clockOffsetMs()));
    } catch (e) {
      setStartError(startRefusal((e as Error).message));
    } finally {
      setStarting(false);
    }
  };

  if (view.kind === 'brief') return <Brief offerTyped={offerTyped} starting={starting} error={startError} onBegin={begin} />;
  if (view.kind === 'other') return <OtherRunning itemId={view.itemId} />;
  if (view.kind === 'ending') return <Ending offline={sync === 'offline'} />;

  const { state } = view;
  const position = state.position;
  const phase = position.status === 'live' ? position.phase : null;
  const remaining = position.status === 'live' ? position.remainingMs : 0;
  const paper = input === 'paper';

  return (
    <div className="dark">
      <main className="flex min-h-dvh flex-col bg-runner text-foreground">
        <header className="border-b border-runner-track">
          <div className="mx-auto flex w-full max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
            <span className="min-w-0 flex-1 truncate font-semibold">PPDT · {phase === 'show' ? 'Look' : phase === 'note' ? 'Note' : 'Write'}</span>
            {!paper && <span className={`text-xs ${sync === 'offline' ? 'text-runner-warn' : 'text-runner-muted'}`} aria-live="polite">{sync === 'offline' ? 'Offline — retrying' : sync === 'saving' ? 'Saving…' : 'Saved'}</span>}
            <span role="timer" aria-label="Time left in this step" className={`min-w-16 rounded-md px-2 py-1 text-center font-mono text-lg font-semibold tabular-nums ${remaining <= 10_000 ? 'bg-runner-warn/20 text-runner-warn' : ''}`}>
              {clock(remaining)}
            </span>
          </div>
        </header>
        <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
          {phase === 'show' && (
            <figure className="flex flex-col items-center">
              {/* The picture is the test: its description would give it away, so the text says only what it is for. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={picture.image} alt="The picture. Look for 30 seconds." className="max-h-[75dvh] w-auto max-w-full rounded-lg shadow-lift" />
              <figcaption className="mt-3 text-sm text-runner-muted">Look closely. It will not come back.</figcaption>
            </figure>
          )}
          {phase === 'note' &&
            (paper ? (
              <PaperStep text="Fill the character box on your sheet: how many people, each one's sex, age and mood, and the action." />
            ) : (
              <NoteForm initial={state.saved['0:note'] ?? ''} onChange={(text) => dispatch({ type: 'input', text })} />
            ))}
          {phase === 'write' &&
            (paper ? (
              <PaperStep text="Write your story on your sheet: what led to this, what is happening, how it ends." />
            ) : (
              <StoryField initial={state.saved['0:write'] ?? ''} onChange={(text) => dispatch({ type: 'input', text })} />
            ))}
        </div>
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Brief({ offerTyped, starting, error, onBegin }: { offerTyped: boolean; starting: boolean; error: string | null; onBegin: (c: { input: InputMode; code: string | null }) => void }) {
  const [input, setInput] = useState<InputMode>(offerTyped ? 'typed' : 'paper');
  const [code] = useState(() => sessionCode(Math.random));
  const paper = input === 'paper';
  const facts = [
    { value: '30 s', label: 'Look' },
    { value: '1 min', label: 'Note' },
    { value: '4 min', label: 'Write' },
  ];
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-runner text-runner-foreground">
      <div aria-hidden="true" className="absolute left-1/2 top-1/3 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-runner-ring/10 blur-3xl" />
      <div className="rise mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-12 sm:px-6">
        <p className="eyebrow text-runner-muted">Before you begin</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Picture Perception</h1>
        <dl className="mt-10 grid grid-cols-3 divide-x divide-runner-track border-y border-runner-track">
          {facts.map((f) => (
            <div key={f.label} className="flex flex-col-reverse px-4 py-5 first:pl-0">
              <dt className="mt-1 text-xs text-runner-muted">{f.label}</dt>
              <dd className="text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 text-lg">Look at the picture, note who is in it, then write a story about it.</p>

        {offerTyped && (
        <fieldset className="mt-8">
          <legend className="eyebrow text-runner-muted">How you&rsquo;ll answer</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {([
              { value: 'typed', label: 'Type on screen', hint: 'Saved as you type' },
              { value: 'paper', label: 'Write on paper', hint: 'As at the SSB · print the sheet first' },
            ] as const).map((c) => (
              <label
                key={c.value}
                className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-lg p-4 ring-1 transition has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-runner-ring ${input === c.value ? 'bg-white/[0.06] ring-runner-ring' : 'ring-runner-track hover:ring-runner-muted'}`}
              >
                <input type="radio" name="answering" value={c.value} checked={input === c.value} onChange={() => setInput(c.value)} aria-label={c.label} className="mt-1 size-4 accent-[hsl(var(--runner-ring))] focus-visible:outline-none" />
                <span>
                  <span className="block font-semibold">{c.label}</span>
                  <span className="block text-sm text-runner-muted">{c.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        )}

        {paper && (
          <div className="mt-4 rounded-lg bg-white/[0.04] p-4 ring-1 ring-runner-track">
            <p className="text-sm text-runner-muted">Write this code in the box at the top of your sheet:</p>
            <p data-testid="session-code" className="mt-1 font-mono text-3xl font-semibold tracking-[0.12em]">{code}</p>
            <p className="mt-3 flex flex-wrap gap-x-5 text-sm">
              <Link href={`/sheets/ppdt?code=${code}`} target="_blank" className="inline-flex min-h-11 items-center font-semibold text-runner-foreground underline underline-offset-4 focus-visible:outline-runner-ring">
                Print the sheet
              </Link>
              <a href="/ppdt-sheet.pdf" download className="inline-flex min-h-11 items-center font-semibold text-runner-foreground underline underline-offset-4 focus-visible:outline-runner-ring">
                Download PDF
              </a>
            </p>
          </div>
        )}

        <p className="mt-6 text-sm text-runner-muted">The clock never pauses. The picture shows once.</p>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button
            type="button"
            onClick={() => onBegin(paper ? { input: 'paper', code } : { input: 'typed', code: null })}
            disabled={starting}
            className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-runner-foreground px-7 text-base font-semibold text-runner shadow-[0_8px_30px_-6px_rgb(122_176_255/0.55)] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring disabled:opacity-60"
          >
            {starting ? 'Starting…' : <>Begin <ArrowIcon /></>}
          </button>
          <Link href="/practise/ppdt" className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-runner-muted underline-offset-4 hover:text-runner-foreground hover:underline focus-visible:outline-runner-ring">
            Not now
          </Link>
        </div>
        {error && <p role="alert" className="mt-5 rounded-lg bg-runner-warn/15 px-4 py-3 text-sm text-runner-foreground ring-1 ring-runner-warn/40">{error}</p>}
      </div>
    </main>
  );
}

const FIELD = 'block min-h-11 w-full rounded-lg border bg-card px-3 text-base focus:border-brand-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-ring';
const MOODS: readonly { mark: MoodMark; label: string; name: string }[] = [
  { mark: '+', label: '+', name: 'positive' },
  { mark: '0', label: '0', name: 'neutral' },
  { mark: '-', label: '−', name: 'negative' },
];

function NoteForm({ initial, onChange }: { initial: string; onChange: (text: string) => void }) {
  const [note, setNote] = useState<PpdtNote>(() => parseNote(initial));
  const update = (next: PpdtNote) => {
    setNote(next);
    onChange(serialiseNote(next));
  };
  const setPerson = (i: number, patch: Partial<PpdtNote['people'][number]>) =>
    update({ ...note, people: note.people.map((p, j) => (j === i ? { ...p, ...patch } : p)) });

  return (
    <section aria-labelledby="note-h" className="mx-auto max-w-2xl rounded-xl border bg-card p-5 shadow-card sm:p-6">
      <h1 id="note-h" className="text-lg font-bold">Character box</h1>
      <div className="mt-4 max-w-40">
        <label htmlFor="ppdt-count" className="block text-sm font-semibold">Characters seen</label>
        <input
          id="ppdt-count"
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={note.count ?? ''}
          onChange={(e) => update(withCount(note, e.target.value === '' ? null : Math.max(0, Math.min(99, Math.trunc(Number(e.target.value))))))}
          className={`mt-1.5 ${FIELD}`}
        />
      </div>
      {note.people.length > 0 && (
        <ol className="mt-4 space-y-2">
          {note.people.map((p, i) => (
            <li key={i}>
              <div role="group" aria-label={`Person ${i + 1}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[1.5rem_5.5rem_4.5rem_1fr]">
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                <label className="sr-only" htmlFor={`sex-${i}`}>Sex</label>
                <select id={`sex-${i}`} value={p.sex} onChange={(e) => setPerson(i, { sex: e.target.value as Sex })} className={FIELD}>
                  <option value="">Sex</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
                <label className="sr-only" htmlFor={`age-${i}`}>Age</label>
                <input id={`age-${i}`} inputMode="numeric" placeholder="Age" value={p.age} maxLength={2} onChange={(e) => setPerson(i, { age: e.target.value.replace(/\D/g, '') })} className={FIELD} />
                <span role="radiogroup" aria-label="Mood" className="col-span-2 col-start-2 flex gap-1.5 sm:col-span-1 sm:col-start-auto">
                  {MOODS.map((m) => (
                    <label key={m.mark} className={`grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-lg border text-lg font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring ${p.mood === m.mark ? 'border-brand bg-brand text-brand-foreground' : 'bg-card'}`}>
                      <input type="radio" name={`mood-${i}`} aria-label={m.name} checked={p.mood === m.mark} onChange={() => setPerson(i, { mood: m.mark })} className="sr-only" />
                      <span aria-hidden="true">{m.label}</span>
                    </label>
                  ))}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
      {note.count !== null && note.count > MAX_ROWS && <p className="mt-2 text-sm text-muted-foreground">Describe the main {MAX_ROWS}.</p>}
      <div className="mt-5">
        <label htmlFor="ppdt-action" className="block text-sm font-semibold">Action</label>
        <input id="ppdt-action" value={note.action} maxLength={300} onChange={(e) => update({ ...note, action: e.target.value })} placeholder="What is happening, in a line" className={`mt-1.5 ${FIELD}`} />
      </div>
    </section>
  );
}

function StoryField({ initial, onChange }: { initial: string; onChange: (text: string) => void }) {
  const [text, setText] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <section className="mx-auto max-w-2xl">
      <label htmlFor="ppdt-story" className="block text-lg font-bold">Your story</label>
      <p className="mt-1 text-sm text-muted-foreground">What led to this, what is happening, how it ends.</p>
      <textarea
        ref={ref}
        id="ppdt-story"
        value={text}
        maxLength={4000}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value);
        }}
        rows={14}
        className="mt-3 block w-full rounded-xl border bg-card p-4 font-serif text-lg leading-relaxed focus:border-brand-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-ring"
      />
      <p className="mt-2 text-right text-sm tabular-nums text-muted-foreground">{words(text)} words</p>
    </section>
  );
}

function PaperStep({ text }: { text: string }) {
  return (
    <section className="mx-auto max-w-xl py-16 text-center">
      <p className="text-2xl font-semibold leading-snug">{text}</p>
      <p className="mt-4 text-sm text-runner-muted">The picture will not come back.</p>
    </section>
  );
}

function OtherRunning({ itemId }: { itemId: string }) {
  return (
    <main className="flex min-h-dvh items-center bg-runner text-runner-foreground">
      <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl font-bold">Another picture is running</h1>
        <p className="mt-2 text-runner-muted">One at a time. Finish it, or let its clock run out, first.</p>
        <Link href={`/picture/${itemId}`} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-lg bg-runner-foreground px-6 font-semibold text-runner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-runner-ring">
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
        <p role="status" className="mt-2 text-runner-muted">{offline ? 'Saving your answers — waiting for the connection.' : 'Saving your answers…'}</p>
      </div>
    </main>
  );
}
