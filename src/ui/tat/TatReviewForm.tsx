'use client';

import { useState } from 'react';
import { COMMENT_MAX, NOTE_MAX, STORIES, draftProblems } from '../../tat/rubric.ts';
import type { StoryMark, TatDraft, TatReview } from '../../tat/rubric.ts';

/**
 * A mentor marks a TAT attempt (D36): each story 1 to 5, or not written, with
 * a short note; then a word on the set. Checked here for the mentor's sake;
 * review_tat (0017) is what enforces it.
 */

export interface TatReviewInput {
  readonly stories: readonly StoryMark[];
  readonly wentWell: string;
  readonly focusOn: string;
}

export type SaveResult = { readonly kind: 'ok' } | { readonly kind: 'refused'; readonly reason: string };

interface Props {
  readonly initial: TatReview | null;
  readonly save: (input: TatReviewInput) => Promise<SaveResult>;
  readonly onDone: () => void;
}

const WHY: Readonly<Record<string, string>> = {
  bad_marks: 'Each story needs a mark from 1 to 5, or not written; and at least one marked.',
  bad_comment: 'Write what went well or what to work on.',
};

const FIELD = 'mt-1.5 w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring';
const CHIP =
  'grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-lg border px-2 text-sm font-semibold tabular-nums hover:bg-secondary has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-brand-foreground has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring';

const blank = (): StoryMark[] => Array.from({ length: STORIES }, () => ({ mark: null, note: null }));

export function TatReviewForm({ initial, save, onDone }: Props) {
  const [draft, setDraft] = useState<TatDraft>({ stories: initial?.stories ?? blank(), wentWell: initial?.wentWell ?? '', focusOn: initial?.focusOn ?? '' });
  // "Not written" is a choice, not the absence of one, so it survives a reload of marks already saved.
  const [notWritten, setNotWritten] = useState<boolean[]>(() => (initial?.stories ?? blank()).map((s) => initial !== null && s.mark === null));
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const edit = (change: (d: TatDraft) => TatDraft) => {
    setDraft(change);
    setProblems([]);
    setSaved(false);
  };
  const setStory = (i: number, patch: Partial<StoryMark>) => edit((d) => ({ ...d, stories: d.stories.map((s, j) => (j === i ? { ...s, ...patch } : s)) }));
  const pick = (i: number, mark: number | null) => {
    setNotWritten((w) => w.map((v, j) => (j === i ? mark === null : v)));
    setStory(i, { mark });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const found = draftProblems(draft);
    setProblems(found);
    if (found.length) return;
    setBusy(true);
    try {
      const r = await save({
        stories: draft.stories.map((s) => ({ mark: s.mark, note: s.note?.trim() ? s.note.trim() : null })),
        wentWell: draft.wentWell.trim(),
        focusOn: draft.focusOn.trim(),
      });
      if (r.kind === 'ok') {
        setSaved(true);
        onDone();
      } else setProblems([WHY[r.reason] ?? 'This attempt cannot be marked.']);
    } catch {
      setProblems(['Could not save. Try again.']);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} aria-labelledby="marks-h" className="space-y-6 rounded-xl border bg-card p-5 shadow-card">
      <div>
        <h2 id="marks-h" className="text-lg font-bold">Marks</h2>
        <p className="mt-1 text-sm text-muted-foreground">Each story from its photo: 1 to 5, or not written. No total.</p>
      </div>

      <ol className="space-y-4">
        {draft.stories.map((s, i) => (
          <li key={i}>
            <fieldset className="space-y-2 border-b pb-4">
              <legend className="font-semibold">Story {i + 1}</legend>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className={CHIP}>
                    <input type="radio" name={`story-${i}`} checked={s.mark === n} onChange={() => pick(i, n)} aria-label={`${n} of 5`} className="sr-only" />
                    {n}
                  </label>
                ))}
                <label className={CHIP}>
                  <input type="radio" name={`story-${i}`} checked={s.mark === null && notWritten[i]} onChange={() => pick(i, null)} className="sr-only" />
                  Not written
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-muted-foreground">Note</span>
                <input value={s.note ?? ''} maxLength={NOTE_MAX} onChange={(e) => setStory(i, { note: e.target.value })} className={FIELD} />
              </label>
            </fieldset>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">
          Went well
          <textarea rows={3} maxLength={COMMENT_MAX} value={draft.wentWell} onChange={(e) => edit((d) => ({ ...d, wentWell: e.target.value }))} className={FIELD} />
        </label>
        <label className="block text-sm font-semibold">
          Work on
          <textarea rows={3} maxLength={COMMENT_MAX} value={draft.focusOn} onChange={(e) => edit((d) => ({ ...d, focusOn: e.target.value }))} className={FIELD} />
        </label>
      </div>

      {problems.length > 0 && (
        <ul role="alert" className="space-y-1 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
          {problems.map((p) => (
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
          {busy ? 'Saving…' : initial ? 'Update marks' : 'Save marks'}
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
