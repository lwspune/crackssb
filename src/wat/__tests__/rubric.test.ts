import { describe, it, expect } from 'vitest';
import { WAT_HEADINGS, WORDS_MAX, readWatReview, watDraftProblems } from '../rubric.ts';

/**
 * The WAT review rubric (D41). A mentor counts the words answered on the sheet
 * (0 to 60), then marks positive, practical and own voice, each 1-5, with
 * went well / work on and no total (D15). review_wat (0019) enforces the same.
 */
const row = (verdict: unknown) => ({ verdict, went_well: 'Positive.', focus_on: null, created_at: '2026-10-19T10:00:00Z', updated_at: null });
const MARKS = { positive: 4, practical: 3, own: 2 };

describe('WAT_HEADINGS', () => {
  it('are positive, practical and own voice, over sixty words', () => {
    expect(WAT_HEADINGS.map((h) => h.label)).toEqual(['Positive', 'Practical', 'Own voice']);
    expect(WORDS_MAX).toBe(60);
  });
});

describe('readWatReview', () => {
  it('reads a stored WAT review, and nothing else', () => {
    expect(readWatReview(row({ rubric: 'wat-1', answered: 55, marks: MARKS }))).toEqual({
      answered: 55,
      marks: MARKS,
      wentWell: 'Positive.',
      focusOn: null,
      at: '2026-10-19T10:00:00Z',
    });
    expect(readWatReview(row({ rubric: 'srt-1', answered: 42, marks: { practical: 4, quick: 3, complete: 4 } }))).toBeNull();
    expect(readWatReview(row({ rubric: 'wat-1', answered: 61, marks: MARKS }))).toBeNull();
    expect(readWatReview(row({ rubric: 'wat-1', answered: 50, marks: { positive: 4, practical: 3 } }))).toBeNull();
    expect(readWatReview(null)).toBeNull();
  });
});

describe('watDraftProblems', () => {
  const ok = { answered: '55', marks: MARKS, wentWell: 'x', focusOn: '' };

  it('is empty for a whole count 0-60, every heading marked and a word of feedback', () => {
    expect(watDraftProblems(ok)).toEqual([]);
    expect(watDraftProblems({ ...ok, answered: '0' })).toEqual([]);
  });

  it('says what is missing, in the order the form shows it', () => {
    expect(watDraftProblems({ ...ok, answered: '' })).toEqual(['Count the words answered: 0 to 60.']);
    expect(watDraftProblems({ ...ok, answered: '61' })).toEqual(['Count the words answered: 0 to 60.']);
    expect(watDraftProblems({ ...ok, answered: '4.5' })).toEqual(['Count the words answered: 0 to 60.']);
    expect(watDraftProblems({ ...ok, marks: { positive: 4 } })).toEqual(['Mark Practical.', 'Mark Own voice.']);
    expect(watDraftProblems({ ...ok, wentWell: ' ' })).toEqual(['Write what went well or what to work on.']);
  });
});
