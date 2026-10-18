import { describe, it, expect } from 'vitest';
import { NARRATION_HEADINGS, STORY_HEADINGS, draftProblems, readReview } from '../rubric.ts';

/**
 * The PPDT review rubric (D34): four story headings and three for the
 * narration, each a whole mark 1 to 5, and a word of feedback. The database
 * enforces the same rule (0015); this is the shape both sides read.
 */
const STORY = { hero: 4, action: 3, outcome: 4, outlook: 5 };
const VOICE = { clarity: 3, confidence: 4, timing: 5 };

describe('the headings', () => {
  it('are the four of the story and the three of the narration the database takes', () => {
    expect(STORY_HEADINGS.map((h) => h.key)).toEqual(['hero', 'action', 'outcome', 'outlook']);
    expect(NARRATION_HEADINGS.map((h) => h.key)).toEqual(['clarity', 'confidence', 'timing']);
  });
});

describe('readReview', () => {
  const row = { verdict: { rubric: 'ppdt-1', story: STORY, narration: VOICE }, went_well: 'Good hero.', focus_on: null, created_at: '2026-10-19T08:00:00Z', updated_at: null };

  it('reads a stored review', () => {
    expect(readReview(row)).toEqual({ story: STORY, narration: VOICE, wentWell: 'Good hero.', focusOn: null, at: '2026-10-19T08:00:00Z' });
  });

  it('dates an edited review by its edit', () => {
    expect(readReview({ ...row, updated_at: '2026-10-20T08:00:00Z' })?.at).toBe('2026-10-20T08:00:00Z');
  });

  it('reads nothing it does not recognise — no row, another rubric, a mark out of range', () => {
    expect(readReview(null)).toBeNull();
    expect(readReview({ ...row, verdict: { ...row.verdict, rubric: 'other' } })).toBeNull();
    expect(readReview({ ...row, verdict: { ...row.verdict, story: { ...STORY, hero: 7 } } })).toBeNull();
  });
});

describe('draftProblems', () => {
  const ok = { story: STORY, narration: VOICE, wentWell: 'Good hero.', focusOn: '' };

  it('passes a complete draft', () => {
    expect(draftProblems(ok, true)).toEqual([]);
    expect(draftProblems({ ...ok, narration: {} }, false)).toEqual([]);
  });

  it('names each heading left unmarked', () => {
    expect(draftProblems({ ...ok, story: { hero: 4 }, narration: { clarity: 3 } }, true)).toEqual([
      'Mark Action.',
      'Mark Outcome.',
      'Mark Outlook.',
      'Mark Confidence.',
      'Mark Within the minute.',
    ]);
  });

  it('asks for a word of feedback, and keeps it short', () => {
    expect(draftProblems({ ...ok, wentWell: '  ', focusOn: '' }, true)).toEqual(['Write what went well or what to work on.']);
    expect(draftProblems({ ...ok, focusOn: 'x'.repeat(1001) }, true)).toEqual(['Keep each note to 1000 characters.']);
  });
});
