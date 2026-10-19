'use client';

import { useState } from 'react';
import { SDT_HEADINGS, sdtDraftProblems } from '../../sdt/rubric.ts';
import type { SdtKey, SdtReview } from '../../sdt/rubric.ts';
import { MarkPicker } from './MarkPicker.tsx';
import { ReviewShell } from './ReviewShell.tsx';
import type { SaveResult } from './ReviewShell.tsx';

/** A mentor marks an SDT (D40): each paragraph 1-5 or not written, then honest and consistent. review_sdt (0018) enforces it. */

export interface SdtReviewInput {
  readonly paragraphs: readonly (number | null)[];
  readonly marks: Readonly<Record<SdtKey, number>>;
  readonly wentWell: string;
  readonly focusOn: string;
}

interface Props {
  readonly prompts: readonly string[];
  readonly initial: SdtReview | null;
  readonly save: (input: SdtReviewInput) => Promise<SaveResult>;
  readonly onDone: () => void;
}

export function SdtReviewForm({ prompts, initial, save, onDone }: Props) {
  const [paragraphs, setParagraphs] = useState<(number | null)[]>(() => initial?.paragraphs.slice() ?? prompts.map(() => null));
  // "Not written" is a choice, not a blank, so it survives a reload of marks already saved.
  const [notWritten, setNotWritten] = useState<boolean[]>(() => (initial?.paragraphs ?? prompts.map(() => null)).map((p) => initial !== null && p === null));
  const [marks, setMarks] = useState<Partial<Record<SdtKey, number>>>(initial?.marks ?? {});
  const [comments, setComments] = useState({ wentWell: initial?.wentWell ?? '', focusOn: initial?.focusOn ?? '' });

  const pick = (i: number, n: number | null) => {
    setParagraphs((p) => p.map((v, j) => (j === i ? n : v)));
    setNotWritten((w) => w.map((v, j) => (j === i ? n === null : v)));
  };

  return (
    <ReviewShell
      lede="Each paragraph from the sheet, then the five together. No total."
      comments={comments}
      onComments={setComments}
      problems={() => sdtDraftProblems({ paragraphs, marks, ...comments })}
      save={() => save({ paragraphs, marks: marks as SdtReviewInput['marks'], wentWell: comments.wentWell.trim(), focusOn: comments.focusOn.trim() })}
      onDone={onDone}
      marked={initial !== null}
    >
      <div className="space-y-4">
        {prompts.map((p, i) => (
          <MarkPicker key={i} name={`paragraph-${i}`} label={`Paragraph ${i + 1}`} hint={p} value={paragraphs[i]} onPick={(n) => pick(i, n)} notWritten={{ chosen: notWritten[i] }} />
        ))}
      </div>
      <div className="space-y-4 border-t pt-4">
        {SDT_HEADINGS.map((h) => (
          <MarkPicker key={h.key} name={h.key} label={h.label} hint={h.hint} value={marks[h.key]} onPick={(n) => n !== null && setMarks((m) => ({ ...m, [h.key]: n }))} />
        ))}
      </div>
    </ReviewShell>
  );
}
