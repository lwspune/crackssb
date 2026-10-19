'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { COMMENT_MAX } from '../../ppdt/rubric.ts';

/**
 * The frame both paper review forms share (D39, D40): the marks the caller
 * lays out, then went well / work on, the problems found, and Save. Checked
 * here for the mentor's sake; the database is what enforces it.
 */

export type SaveResult = { readonly kind: 'ok' } | { readonly kind: 'refused'; readonly reason: string };

const FIELD = 'mt-1.5 w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring';
const WHY: Readonly<Record<string, string>> = {
  bad_marks: 'Some marks are missing or out of range.',
  bad_comment: 'Write what went well or what to work on.',
};

interface Props {
  readonly lede: string;
  readonly children: ReactNode;
  readonly comments: { readonly wentWell: string; readonly focusOn: string };
  readonly onComments: (c: { wentWell: string; focusOn: string }) => void;
  readonly problems: () => string[];
  readonly save: () => Promise<SaveResult>;
  readonly onDone: () => void;
  readonly marked: boolean;
}

export function ReviewShell({ lede, children, comments, onComments, problems, save, onDone, marked }: Props) {
  const [shown, setShown] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const found = problems();
    setShown(found);
    if (found.length) return;
    setBusy(true);
    try {
      const r = await save();
      if (r.kind === 'ok') {
        setSaved(true);
        onDone();
      } else setShown([WHY[r.reason] ?? 'This attempt cannot be marked.']);
    } catch {
      setShown(['Could not save. Try again.']);
    } finally {
      setBusy(false);
    }
  };

  // Any change makes the old problems, and "Saved", out of date.
  const changed = () => {
    setShown([]);
    setSaved(false);
  };

  return (
    <form onSubmit={(e) => void submit(e)} onChange={changed} aria-labelledby="marks-h" className="space-y-6 rounded-xl border bg-card p-5 shadow-card">
      <div>
        <h2 id="marks-h" className="text-lg font-bold">Marks</h2>
        <p className="mt-1 text-sm text-muted-foreground">{lede}</p>
      </div>
      {children}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Went well
          <textarea rows={3} maxLength={COMMENT_MAX} value={comments.wentWell} onChange={(e) => onComments({ ...comments, wentWell: e.target.value })} className={FIELD} />
        </label>
        <label className="block text-sm font-semibold">
          Work on
          <textarea rows={3} maxLength={COMMENT_MAX} value={comments.focusOn} onChange={(e) => onComments({ ...comments, focusOn: e.target.value })} className={FIELD} />
        </label>
      </div>
      {shown.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
          {shown.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-12 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
        >
          {busy ? 'Saving…' : marked ? 'Update marks' : 'Save marks'}
        </button>
        {saved && (
          <p role="status" className="text-sm font-medium text-correct">
            Saved. The candidate can see it.
          </p>
        )}
      </div>
    </form>
  );
}
