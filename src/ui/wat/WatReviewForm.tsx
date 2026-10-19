'use client';

import { useState } from 'react';
import { WAT_HEADINGS, WORDS_MAX, watDraftProblems } from '../../wat/rubric.ts';
import type { WatKey, WatReview } from '../../wat/rubric.ts';
import { MarkPicker } from '../paper/MarkPicker.tsx';
import { ReviewShell } from '../paper/ReviewShell.tsx';
import type { SaveResult } from '../paper/ReviewShell.tsx';

/** A mentor marks a WAT (D41): words answered, then positive, practical, own voice. review_wat (0019) enforces it. */

export interface WatReviewInput {
  readonly answered: number;
  readonly marks: Readonly<Record<WatKey, number>>;
  readonly wentWell: string;
  readonly focusOn: string;
}

interface Props {
  readonly initial: WatReview | null;
  readonly save: (input: WatReviewInput) => Promise<SaveResult>;
  readonly onDone: () => void;
}

export function WatReviewForm({ initial, save, onDone }: Props) {
  const [answered, setAnswered] = useState(initial ? String(initial.answered) : '');
  const [marks, setMarks] = useState<Partial<Record<WatKey, number>>>(initial?.marks ?? {});
  const [comments, setComments] = useState({ wentWell: initial?.wentWell ?? '', focusOn: initial?.focusOn ?? '' });

  return (
    <ReviewShell
      lede="From the photos of the sheet. No total."
      comments={comments}
      onComments={setComments}
      problems={() => watDraftProblems({ answered, marks, ...comments })}
      save={() => save({ answered: Number(answered), marks: marks as WatReviewInput['marks'], wentWell: comments.wentWell.trim(), focusOn: comments.focusOn.trim() })}
      onDone={onDone}
      marked={initial !== null}
    >
      <label className="block max-w-56 text-sm font-semibold">
        Words answered <span className="font-normal text-muted-foreground">(of {WORDS_MAX})</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={WORDS_MAX}
          value={answered}
          onChange={(e) => setAnswered(e.target.value)}
          className="mt-1.5 block min-h-11 w-full rounded-lg border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring"
        />
      </label>
      <div className="space-y-4">
        {WAT_HEADINGS.map((h) => (
          <MarkPicker key={h.key} name={h.key} label={h.label} hint={h.hint} value={marks[h.key]} onPick={(n) => n !== null && setMarks((m) => ({ ...m, [h.key]: n }))} />
        ))}
      </div>
    </ReviewShell>
  );
}
