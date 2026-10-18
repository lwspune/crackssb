'use client';

import { useState } from 'react';
import { COMMENT_MAX, MARKS, NARRATION_HEADINGS, STORY_HEADINGS, draftProblems } from '../../ppdt/rubric.ts';
import type { Draft, NarrationKey, Review, StoryKey } from '../../ppdt/rubric.ts';

/**
 * A mentor marks a PPDT attempt (D34): each heading 1 to 5, the narration's
 * only when there is one, and a word of feedback. Checked here for the
 * mentor's sake; review_attempt (0015) is what enforces it.
 */

export interface ReviewInput {
  readonly story: Readonly<Record<StoryKey, number>>;
  readonly narration: Readonly<Record<NarrationKey, number>> | null;
  readonly wentWell: string;
  readonly focusOn: string;
}

export type SaveResult = { readonly kind: 'ok' } | { readonly kind: 'refused'; readonly reason: string };

interface Props {
  readonly hasNarration: boolean;
  readonly initial: Review | null;
  readonly save: (input: ReviewInput) => Promise<SaveResult>;
  readonly onDone: () => void;
}

const WHY: Readonly<Record<string, string>> = {
  bad_marks: 'Every heading needs a mark from 1 to 5.',
  bad_comment: 'Write what went well or what to work on.',
};

function Heading({ name, label, hint, value, onPick }: { name: string; label: string; hint: string; value: number | undefined; onPick: (n: number) => void }) {
  return (
    // A legend names its fieldset only as its first child, and will not sit in a grid: the visible label is a copy.
    <fieldset aria-describedby={`${name}-hint`} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <legend className="sr-only">{label}</legend>
      <div>
        <p aria-hidden="true" className="font-semibold">{label}</p>
        <p id={`${name}-hint`} className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="flex gap-1.5">
        {MARKS.map((n) => (
          <label
            key={n}
            className="grid size-11 cursor-pointer place-items-center rounded-lg border text-sm font-semibold tabular-nums hover:bg-secondary has-[:checked]:border-brand has-[:checked]:bg-brand has-[:checked]:text-brand-foreground has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
          >
            <input type="radio" name={name} value={n} checked={value === n} onChange={() => onPick(n)} className="sr-only" />
            {n}
            <span className="sr-only"> of 5</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const FIELD = 'mt-1.5 w-full rounded-lg border bg-background px-3.5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-ring';

export function ReviewForm({ hasNarration, initial, save, onDone }: Props) {
  const [draft, setDraft] = useState<Draft>({
    story: initial?.story ?? {},
    narration: initial?.narration ?? {},
    wentWell: initial?.wentWell ?? '',
    focusOn: initial?.focusOn ?? '',
  });
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  // Any change makes the old list of problems, and "Saved", out of date.
  const edit = (change: (d: Draft) => Draft) => {
    setDraft(change);
    setProblems([]);
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    const found = draftProblems(draft, hasNarration);
    setProblems(found);
    if (found.length) return;
    setBusy(true);
    try {
      const r = await save({
        story: draft.story as ReviewInput['story'],
        narration: hasNarration ? (draft.narration as ReviewInput['narration']) : null,
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
      <h2 id="marks-h" className="text-lg font-bold">Marks</h2>

      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Story</h3>
        {STORY_HEADINGS.map((h) => (
          <Heading key={h.key} name={h.key} label={h.label} hint={h.hint} value={draft.story[h.key]} onPick={(n) => edit((d) => ({ ...d, story: { ...d.story, [h.key]: n } }))} />
        ))}
      </div>

      {hasNarration && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Narration</h3>
          {NARRATION_HEADINGS.map((h) => (
            <Heading key={h.key} name={h.key} label={h.label} hint={h.hint} value={draft.narration[h.key]} onPick={(n) => edit((d) => ({ ...d, narration: { ...d.narration, [h.key]: n } }))} />
          ))}
        </div>
      )}

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
