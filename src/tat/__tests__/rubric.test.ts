import { describe, it, expect } from 'vitest';
import { NOTE_MAX, STORIES, draftProblems, readTatReview } from '../rubric.ts';

/**
 * The TAT review rubric (D36): each of the twelve stories a whole mark 1-5,
 * or none when it was not written, with a short note; then what went well and
 * what to work on. No total (D15). review_tat (0017) enforces the same.
 */
const marks = (m: number | null = 3) => Array.from({ length: STORIES }, (_, i) => ({ mark: i === 11 ? null : m, note: i === 0 ? 'Clear hero.' : null }));

describe('readTatReview', () => {
  it('reads a stored TAT review', () => {
    expect(
      readTatReview({ verdict: { rubric: 'tat-1', stories: marks() }, went_well: 'Heroes act.', focus_on: null, created_at: '2026-10-19T10:00:00Z', updated_at: null }),
    ).toEqual({ stories: marks(), wentWell: 'Heroes act.', focusOn: null, at: '2026-10-19T10:00:00Z' });
  });

  it('reads nothing else: a PPDT review, a short list, a mark out of range', () => {
    const row = (verdict: unknown) => ({ verdict, went_well: 'x', focus_on: null, created_at: '2026-10-19T10:00:00Z', updated_at: null });
    expect(readTatReview(row({ rubric: 'ppdt-1', story: { hero: 3, action: 3, outcome: 3, outlook: 3 }, narration: null }))).toBeNull();
    expect(readTatReview(row({ rubric: 'tat-1', stories: marks().slice(1) }))).toBeNull();
    expect(readTatReview(row({ rubric: 'tat-1', stories: marks(6) }))).toBeNull();
    expect(readTatReview(null)).toBeNull();
  });
});

describe('draftProblems', () => {
  const draft = { stories: marks(), wentWell: 'Heroes act.', focusOn: '' };

  it('passes a draft with every written story marked and a word of feedback', () => {
    expect(draftProblems(draft)).toEqual([]);
  });

  it('asks for at least one mark, a word of feedback, and short notes', () => {
    expect(draftProblems({ ...draft, stories: marks(null) })).toEqual(['Mark at least one story.']);
    expect(draftProblems({ ...draft, wentWell: ' ' })).toEqual(['Write what went well or what to work on.']);
    expect(draftProblems({ ...draft, stories: marks().map((s, i) => (i === 3 ? { ...s, note: 'x'.repeat(NOTE_MAX + 1) } : s)) })).toEqual([`Keep the note on story 4 to ${NOTE_MAX} characters.`]);
  });
});
