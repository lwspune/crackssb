'use client';

import { useEffect, useRef, useState } from 'react';
import type { UploadRequest } from '../sheet/SheetUpload.tsx';

/**
 * Narrating the story aloud (D34): at the SSB each candidate tells their story
 * to the group in about a minute. The browser's own recorder, no package; the
 * take stops itself at the minute and is saved the moment it stops (the server
 * names a fresh path, 0014; it goes straight to private storage). Record again
 * until the attempt is sent for review; then it only plays.
 */

export const LIMIT_MS = 60_000;
const SHORTEST_MS = 1_000;

/** What the browser records in, and the plain type the database keeps. Opus where it can; Safari records MP4. */
export function pickMime(supported: (type: string) => boolean): { recorder: string; stored: string } | null {
  for (const recorder of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm']) {
    if (supported(recorder)) return { recorder, stored: recorder.split(';')[0] };
  }
  return null;
}

export interface Take {
  readonly blob: Blob;
  readonly durationMs: number;
  readonly mime: string;
}

export interface Mic {
  start(): void;
  stop(): Promise<Take>;
  /** Let the microphone go without a take. */
  cancel(): void;
}

class MicError extends Error {
  constructor(readonly reason: 'denied' | 'unsupported') {
    super(reason);
  }
}

export async function openMic(): Promise<Mic> {
  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) throw new MicError('unsupported');
  const type = pickMime((t) => MediaRecorder.isTypeSupported(t));
  if (!type) throw new MicError('unsupported');
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    throw new MicError('denied');
  }
  const recorder = new MediaRecorder(stream, { mimeType: type.recorder });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const release = () => stream.getTracks().forEach((t) => t.stop());
  let began = 0;
  return {
    start() {
      began = performance.now();
      recorder.start();
    },
    stop() {
      return new Promise((resolve) => {
        recorder.onstop = () => {
          release();
          resolve({ blob: new Blob(chunks, { type: type.stored }), durationMs: Math.round(performance.now() - began), mime: type.stored });
        };
        recorder.stop();
      });
    },
    cancel() {
      recorder.onstop = release;
      if (recorder.state !== 'inactive') recorder.stop();
      else release();
    },
  };
}

const clock = (ms: number) => {
  // Down, as the audio player counts: the two must agree.
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

interface Props {
  readonly sessionId: string;
  readonly narration: { readonly url: string; readonly durationMs: number } | null;
  /** Sent for review: it only plays. */
  readonly locked: boolean;
  readonly request: (sessionId: string, mime: string, durationMs: number) => Promise<UploadRequest>;
  readonly upload: (path: string, token: string, take: Blob, mime: string) => Promise<{ error: { message: string } | null }>;
  readonly openMic?: () => Promise<Mic>;
  /** After a take is saved: the app refreshes to show it. */
  readonly onDone: () => void;
}

type Phase = 'idle' | 'starting' | 'recording' | 'saving';

const PRIMARY =
  'inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60';
const SECONDARY = 'inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60';

export function NarrationRecorder({ sessionId, narration, locked, request, upload, openMic: open = openMic, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mic = useRef<Mic | null>(null);
  const began = useRef(0);

  // Leaving the page mid-take lets the microphone go.
  useEffect(() => () => mic.current?.cancel(), []);

  const finish = async () => {
    const m = mic.current;
    if (!m) return;
    mic.current = null;
    setPhase('saving');
    try {
      const take = await m.stop();
      if (take.durationMs < SHORTEST_MS) {
        setError('Too short. Record again.');
        return;
      }
      const durationMs = Math.min(take.durationMs, LIMIT_MS);
      const r = await request(sessionId, take.mime, durationMs);
      if (r.kind !== 'ok') {
        setError(r.kind === 'forbidden' ? 'You cannot record for this attempt.' : 'Could not start saving. Try again.');
        return;
      }
      const { error: upErr } = await upload(r.path, r.token, take.blob, take.mime);
      if (upErr) {
        setError('The recording did not save. Check your connection and record again.');
        return;
      }
      onDone();
    } catch {
      setError('The recording did not save. Record again.');
    } finally {
      setPhase('idle');
    }
  };

  // The minute: a tick for the clock, and the stop at the limit.
  useEffect(() => {
    if (phase !== 'recording') return;
    const id = setInterval(() => {
      const ms = Date.now() - began.current;
      setElapsed(ms);
      if (ms >= LIMIT_MS) void finish();
    }, 250);
    return () => clearInterval(id);
    // finish reads refs and props only; re-arming the tick on each render would drift it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const start = async () => {
    setError(null);
    setPhase('starting');
    try {
      const m = await open();
      mic.current = m;
      began.current = Date.now();
      setElapsed(0);
      m.start();
      setPhase('recording');
    } catch (e) {
      const reason = (e as { reason?: string }).reason;
      setError(reason === 'denied' ? 'Allow the microphone, then try again.' : 'This browser cannot record. Try Chrome or Safari.');
      setPhase('idle');
    }
  };

  return (
    <section aria-labelledby="narration-h" className="rounded-xl border bg-card p-5 shadow-card">
      <h2 id="narration-h" className="text-lg font-bold">Narration</h2>
      {!locked && <p className="mt-1 text-sm text-muted-foreground">Tell your story aloud, as you would to the group. One minute.</p>}

      {narration && phase !== 'recording' && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <audio controls preload="metadata" src={narration.url} className="h-11 w-full max-w-sm" aria-label="Your narration" />
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">{clock(narration.durationMs)}</span>
        </div>
      )}
      {locked && !narration && <p className="mt-3 text-sm text-muted-foreground">No narration.</p>}

      {!locked && (
        <div className="mt-4">
          {phase === 'recording' ? (
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 font-semibold tabular-nums" aria-live="off">
                <span aria-hidden="true" className="size-3 animate-pulse rounded-full bg-destructive" />
                {clock(elapsed)} <span className="font-normal text-muted-foreground">of 1:00</span>
              </span>
              <div aria-hidden="true" className="h-1.5 min-w-24 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-brand transition-[width] duration-200" style={{ width: `${Math.min(100, (elapsed / LIMIT_MS) * 100)}%` }} />
              </div>
              <button type="button" onClick={() => void finish()} className={PRIMARY}>
                Stop
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => void start()} disabled={phase !== 'idle'} className={narration ? SECONDARY : PRIMARY}>
              {phase === 'starting' ? 'Starting…' : phase === 'saving' ? 'Saving…' : narration ? 'Record again' : 'Record'}
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
