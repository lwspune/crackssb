import { describe, it, expect } from 'vitest';
import { readSdtReview, sdtDraftProblems } from '../../sdt/rubric.ts';
import { readSrtReview, srtDraftProblems } from '../rubric.ts';

/**
 * The SRT and SDT review rubrics (D39, D40). SRT: how many situations were
 * answered, then practical, quick and complete, each 1-5. SDT: each of the
 * five paragraphs 1-5 or not written, then honest and consistent. Each with
 * went well / work on, no total (D15). review_srt and review_sdt (0018)
 * enforce the same.
 */
const row = (verdict: unknown) => ({ verdict, went_well: 'Practical.', focus_on: null, created_at: '2026-10-19T10:00:00Z', updated_at: null });

describe('readSrtReview', () => {
  it('reads a stored SRT review, and nothing else', () => {
    expect(readSrtReview(row({ rubric: 'srt-1', answered: 42, marks: { practical: 4, quick: 3, complete: 4 } }))).toEqual({
      answered: 42,
      marks: { practical: 4, quick: 3, complete: 4 },
      wentWell: 'Practical.',
      focusOn: null,
      at: '2026-10-19T10:00:00Z',
    });
    expect(readSrtReview(row({ rubric: 'sdt-1', paragraphs: [3, 3, 3, 3, 3], marks: { honest: 3, consistent: 3 } }))).toBeNull();
    expect(readSrtReview(row({ rubric: 'srt-1', answered: 61, marks: { practical: 4, quick: 3, complete: 4 } }))).toBeNull();
  });
});

describe('readSdtReview', () => {
  it('reads a stored SDT review, and nothing else', () => {
    expect(readSdtReview(row({ rubric: 'sdt-1', paragraphs: [3, 4, null, 2, 5], marks: { honest: 4, consistent: 3 } }))?.paragraphs).toEqual([3, 4, null, 2, 5]);
    expect(readSdtReview(row({ rubric: 'srt-1', answered: 42, marks: { practical: 4, quick: 3, complete: 4 } }))).toBeNull();
    expect(readSdtReview(row({ rubric: 'sdt-1', paragraphs: [3, 4], marks: { honest: 4, consistent: 3 } }))).toBeNull();
  });
});

describe('draft problems', () => {
  it('SRT: a count from 0 to 60, every heading marked, a word of feedback', () => {
    const ok = { answered: '42', marks: { practical: 4, quick: 3, complete: 4 }, wentWell: 'x', focusOn: '' };
    expect(srtDraftProblems(ok)).toEqual([]);
    expect(srtDraftProblems({ ...ok, answered: '' })).toEqual(['Count the situations answered: 0 to 60.']);
    expect(srtDraftProblems({ ...ok, answered: '61' })).toEqual(['Count the situations answered: 0 to 60.']);
    expect(srtDraftProblems({ ...ok, marks: { practical: 4 } })).toEqual(['Mark Quick.', 'Mark Complete.']);
    expect(srtDraftProblems({ ...ok, wentWell: ' ' })).toEqual(['Write what went well or what to work on.']);
  });

  it('SDT: at least one paragraph marked, both headings, a word of feedback', () => {
    const ok = { paragraphs: [3, null, null, null, null], marks: { honest: 4, consistent: 3 }, wentWell: '', focusOn: 'x' };
    expect(sdtDraftProblems(ok)).toEqual([]);
    expect(sdtDraftProblems({ ...ok, paragraphs: [null, null, null, null, null] })).toEqual(['Mark at least one paragraph.']);
    expect(sdtDraftProblems({ ...ok, marks: { honest: 4 } })).toEqual(['Mark Consistent.']);
  });
});
