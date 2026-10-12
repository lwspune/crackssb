import { describe, it, expect } from 'vitest';
import { assessCompleteness } from '../completeness.ts';

/**
 * Layer 1 — counts and thresholds. No model.
 *
 * Every expected value here is taken from the LWS Pune corpus (11 sheets,
 * 31 July 2026). See corpus/CODEBOOK.md. Where a test asserts a number,
 * that number is what the assessor actually wrote on a real sheet.
 */

const blanks = (n: number) => Array.from({ length: n }, () => null);
const filled = (n: number, text = 'He will act.') =>
  Array.from({ length: n }, () => text);

const codes = (fs: { code: string }[]) => fs.map((f) => f.code).sort();

describe('SRT attempt threshold', () => {
  it('flags 16 attempts against the assessor target of 45', () => {
    // cand-01, cand-02 cand-02, cand-03, cand-05, cand-06
    // all attempted exactly 16. Assessor: "Only 16 SRT / You Need to do 45+ SRT".
    const found = assessCompleteness({
      instrument: 'srt',
      responses: [...filled(16), ...blanks(44)],
    });
    const f = found.find((x) => x.code === 'attempts_below_target');
    expect(f).toBeDefined();
    expect(f!.observed).toBe(16);
    expect(f!.expected).toBe(45);
    expect(f!.severity).toBe('high');
  });

  it('still flags 29 attempts — the corpus maximum is below target', () => {
    // cand-07 cand-07, the highest in the corpus, was still told "Need to Do 45+ SRT".
    const found = assessCompleteness({
      instrument: 'srt',
      responses: [...filled(29), ...blanks(31)],
    });
    expect(codes(found)).toContain('attempts_below_target');
  });

  it('does not flag once the target is met', () => {
    const found = assessCompleteness({
      instrument: 'srt',
      responses: [...filled(45), ...blanks(15)],
    });
    expect(codes(found)).not.toContain('attempts_below_target');
  });

  it('treats whitespace-only responses as blank', () => {
    const found = assessCompleteness({
      instrument: 'srt',
      responses: [...filled(10), '   ', '\n\t', ...blanks(48)],
    });
    expect(found.find((f) => f.code === 'attempts_below_target')!.observed).toBe(10);
  });
});

describe('WAT blank counting', () => {
  it('counts 24 blanks out of 60 as 36 attempted', () => {
    // cand-02 cand-02. Assessor tally on the sheet: 9 + 6 + 9 = 24.
    const found = assessCompleteness({
      instrument: 'wat',
      responses: [...filled(36, 'Honesty is the best policy.'), ...blanks(24)],
    });
    const f = found.find((x) => x.code === 'blank_responses');
    expect(f).toBeDefined();
    expect(f!.observed).toBe(24);
    expect(f!.expected).toBe(0);
  });

  it('counts 10 blanks as 50 attempted', () => {
    // cand-03. Assessor wrote "10 WAT Not Attempted" beside the sum 3 + 5 + 2.
    const found = assessCompleteness({
      instrument: 'wat',
      responses: [...filled(50, 'Practice makes one perfect.'), ...blanks(10)],
    });
    expect(found.find((f) => f.code === 'blank_responses')!.observed).toBe(10);
  });

  it('raises no blank finding on a full sheet', () => {
    const found = assessCompleteness({
      instrument: 'wat',
      responses: filled(60, 'Risks lead to success.'),
    });
    expect(codes(found)).not.toContain('blank_responses');
  });
});

describe('TAT story completeness', () => {
  it('flags 4 blank stories out of 12', () => {
    // cand-05. Assessor: "04 Blank TAT stories".
    const found = assessCompleteness({
      instrument: 'tat',
      responses: [...filled(8, 'Ram, 24, led his team to...'), ...blanks(4)],
    });
    const f = found.find((x) => x.code === 'blank_responses');
    expect(f!.observed).toBe(4);
  });

  it('accepts a complete set of 12', () => {
    const found = assessCompleteness({
      instrument: 'tat',
      responses: filled(12, 'Ram, 24, led his team to victory.'),
    });
    expect(found).toHaveLength(0);
  });
});

describe('SDT opinions', () => {
  const longOpinion = filled(1, 'word '.repeat(85))[0];

  it('flags incomplete opinions when only 3 of 5 are written', () => {
    // cand-01 wrote 3, left the 4th thin and the 5th blank.
    // Assessor: "Need to complete your 4th & 5th opinions".
    const found = assessCompleteness({
      instrument: 'sdt',
      responses: [longOpinion, longOpinion, longOpinion, null, null],
    });
    const f = found.find((x) => x.code === 'incomplete_opinions');
    expect(f).toBeDefined();
    expect(f!.observed).toBe(3);
    expect(f!.expected).toBe(5);
  });

  it('flags an opinion shorter than the 80-word rule, naming its ordinal', () => {
    // Assessor, on cand-02's sheet: "You Need to write much more,
    // about 80-90 words (6-7 lines) under each opinion".
    const found = assessCompleteness({
      instrument: 'sdt',
      responses: [
        longOpinion,
        'Avg student, talkative, discipline, helping nature, active in class.',
        longOpinion,
        longOpinion,
        longOpinion,
      ],
    });
    const short = found.filter((f) => f.code === 'opinion_too_short');
    expect(short).toHaveLength(1);
    expect(short[0].ordinal).toBe(2);
    expect(short[0].expected).toBe(80);
  });

  it('accepts five opinions that all meet the length rule', () => {
    const found = assessCompleteness({
      instrument: 'sdt',
      responses: Array.from({ length: 5 }, () => longOpinion),
    });
    expect(found).toHaveLength(0);
  });

  it('flags every short opinion, not just the first', () => {
    const found = assessCompleteness({
      instrument: 'sdt',
      responses: [longOpinion, 'too short', 'also short', longOpinion, longOpinion],
    });
    expect(found.filter((f) => f.code === 'opinion_too_short')).toHaveLength(2);
  });
});

describe('input validation at the boundary', () => {
  it('rejects an unknown instrument rather than scoring it', () => {
    expect(() =>
      // @ts-expect-error deliberately invalid
      assessCompleteness({ instrument: 'lecturette', responses: [] }),
    ).toThrow(/unknown instrument/i);
  });

  it('rejects more responses than the instrument defines', () => {
    expect(() =>
      assessCompleteness({ instrument: 'tat', responses: filled(13) }),
    ).toThrow(/expects at most 12/i);
  });
});
