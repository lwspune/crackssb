'use client';

import { useState } from 'react';
import { SITUATIONS_MAX, SRT_HEADINGS, srtDraftProblems } from '../../srt/rubric.ts';
import type { SrtKey, SrtReview } from '../../srt/rubric.ts';
import { MarkPicker } from './MarkPicker.tsx';
import { ReviewShell } from './ReviewShell.tsx';
import type { SaveResult } from './ReviewShell.tsx';

/** A mentor marks an SRT (D39): situations answered, then practical, quick, complete. review_srt (0018) enforces it. */

export interface SrtReviewInput {
  readonly answered: number;
  readonly marks: Readonly<Record<SrtKey, number>>;
  readonly wentWell: string;
  readonly focusOn: string;
}

interface Props {
  readonly initial: SrtReview | null;
  readonly save: (input: SrtReviewInput) => Promise<SaveResult>;
  readonly onDone: () => void;
}

export function SrtReviewForm({ initial, save, onDone }: Props) {
  const [answered, setAnswered] = useState(initial ? String(initial.answered) : '');
  const [marks, setMarks] = useState<Partial<Record<SrtKey, number>>>(initial?.marks ?? {});
  const [comments, setComments] = useState({ wentWell: initial?.wentWell ?? '', focusOn: initial?.focusOn ?? '' });

  return (
    <ReviewShell
      lede="From the photos of the sheet. No total."
      comments={comments}
      onComments={setComments}
      problems={() => srtDraftProblems({ answered, marks, ...comments })}
      save={() => save({ answered: Number(answered), marks: marks as SrtReviewInput['marks'], wentWell: comments.wentWell.trim(), focusOn: comments.focusOn.trim() })}
      onDone={onDone}
      marked={initial !== null}
    >
      <label className="block max-w-56 text-sm font-semibold">
        Situations answered <span className="font-normal text-muted-foreground">(of {SITUATIONS_MAX})</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={SITUATIONS_MAX}
          value={answered}
          onChange={(e) => setAnswered(e.target.value)}
          className="mt-1.5 block min-h-11 w-full rounded-lg border bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-ring"
        />
      </label>
      <div className="space-y-4">
        {SRT_HEADINGS.map((h) => (
          <MarkPicker key={h.key} name={h.key} label={h.label} hint={h.hint} value={marks[h.key]} onPick={(n) => n !== null && setMarks((m) => ({ ...m, [h.key]: n }))} />
        ))}
      </div>
    </ReviewShell>
  );
}
