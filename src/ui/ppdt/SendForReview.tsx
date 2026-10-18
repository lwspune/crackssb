'use client';

import { useState } from 'react';

/**
 * Sending a PPDT attempt for a mentor's review (D34). Once, after a confirm:
 * the database fixes the attempt (0014), so what is read and heard is what
 * was sent. It needs something to review — on paper, a photo of the sheet.
 */

export type SendResult = { readonly kind: 'ok'; readonly at: string } | { readonly kind: 'refused'; readonly reason: string };

interface Props {
  /** There is something to review: a story typed, or a sheet photographed. */
  readonly ready: boolean;
  readonly paper: boolean;
  readonly hasNarration: boolean;
  readonly submittedAt: string | null;
  readonly submit: () => Promise<SendResult>;
  readonly onDone: () => void;
}

const WHY: Readonly<Record<string, string>> = {
  nothing_to_review: 'Nothing to send yet.',
  no_recording: 'Your last recording did not save. Record again, or send once more.',
};

const PRIMARY =
  'inline-flex min-h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY = 'inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

export function SendForReview({ ready, paper, hasNarration, submittedAt, submit, onDone }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (submittedAt) {
    return (
      <section aria-labelledby="review-h" className="rounded-xl border bg-card p-5 shadow-card">
        <h2 id="review-h" className="text-lg font-bold">Review</h2>
        <p className="mt-2 text-sm">
          Sent for review on <span className="font-semibold">{day(submittedAt)}</span>. Marks appear here once it is read.
        </p>
      </section>
    );
  }

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await submit();
      if (r.kind === 'ok') onDone();
      else setError(WHY[r.reason] ?? 'Could not send. Try again.');
    } catch {
      setError('Could not send. Try again.');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <section aria-labelledby="review-h" className="rounded-xl border bg-card p-5 shadow-card">
      <h2 id="review-h" className="text-lg font-bold">Review</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your {paper ? 'sheet' : 'story'}
        {hasNarration ? ' and narration' : ''}, to your mentor for marks.
      </p>
      {!hasNarration && <p className="mt-1 text-sm text-muted-foreground">No narration recorded. You can send without one.</p>}
      {!ready && paper && <p className="mt-1 text-sm font-medium">Photograph your sheet first.</p>}

      <div className="mt-4">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="w-full text-sm font-medium">Send it? Nothing can change after.</p>
            <button type="button" onClick={() => void send()} disabled={busy} className={PRIMARY}>
              {busy ? 'Sending…' : 'Send'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={SECONDARY}>
              Not yet
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} disabled={!ready} className={PRIMARY}>
            Send for review
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
