import { describe, it, expect } from 'vitest';
import { assessLexical } from '../lexical.ts';

/**
 * Layer 2 — lexical rules. No model.
 *
 * Every rule below is one the LWS Pune assessor applied by hand across the
 * 11-sheet corpus, and every quoted response is a real one from a real sheet.
 * See corpus/CODEBOOK.md section 4.
 */

const rules = (fs: { rule: string }[]) => fs.map((f) => f.rule);

describe('SRT — modal obligation must become "He will"', () => {
  it('flags "He must"', () => {
    // cand-01, SRT 8. Struck through and rewritten "will" by the assessor.
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He must take loan from the bank'],
    });
    expect(rules(found)).toContain('srt_modal_obligation');
    expect(found[0].ordinal).toBe(1);
    expect(found[0].suggestion).toMatch(/will/);
  });

  it('flags "He should"', () => {
    // cand-01, SRT 15.
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He should take the help of other boats to save those persons'],
    });
    expect(rules(found)).toContain('srt_modal_obligation');
  });

  it('passes a response already in the target form', () => {
    // cand-03 wrote "He will" throughout and received zero corrections.
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He will plug the hole, bail out the water and resume'],
    });
    expect(found).toHaveLength(0);
  });

  it('does not mistake "willing" for the auxiliary "will"', () => {
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He is willing to help the injured lady'],
    });
    expect(rules(found)).toContain('srt_non_future');
    expect(rules(found)).not.toContain('srt_modal_obligation');
  });
});

describe('SRT — non-future constructions', () => {
  it('flags a past-tense response', () => {
    // cand-05 wrote in past tense; the assessor inserted "will" 15 times.
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He took purse submit at police station and then went to friend house'],
    });
    expect(rules(found)).toContain('srt_non_future');
  });

  it('flags a bare present-tense response', () => {
    // cand-02 cand-02's habitual construction.
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He call his sister and told all the situation'],
    });
    expect(rules(found)).toContain('srt_non_future');
  });

  it('does not double-report a response already caught as modal obligation', () => {
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He must go to the hospital'],
    });
    expect(rules(found)).toEqual(['srt_modal_obligation']);
  });
});

describe('tentative verbs are penalised', () => {
  it('flags "tried"', () => {
    // cand-04, SRT 20. Assessor: "Avoid TRY / TRIED".
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He will rescue him after he tried the other path'],
    });
    expect(rules(found)).toContain('tentative_verb');
  });

  it('flags "try"', () => {
    // cand-05, SRT 15. Assessor: "Avoid TRY". cand-10: "AVOID using TRY".
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He will try to block the hole then used safety equipments'],
    });
    expect(rules(found)).toContain('tentative_verb');
  });

  it('does not flag words merely containing "try"', () => {
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He will reach the industry and the country border by night'],
    });
    expect(rules(found)).not.toContain('tentative_verb');
  });
});

describe('WAT — personal pronouns are penalised', () => {
  it('flags a first-person response', () => {
    // cand-02 cand-02, WAT 2. Assessor: "Avoid writing I, me, myself...".
    const found = assessLexical({
      instrument: 'wat',
      responses: ['I feel jealous when my friend give'],
    });
    expect(rules(found)).toContain('wat_personal_pronoun');
  });

  it('flags a possessive opener', () => {
    // cand-02 cand-02, WAT 1.
    const found = assessLexical({
      instrument: 'wat',
      responses: ['My sister is very naughty'],
    });
    expect(rules(found)).toContain('wat_personal_pronoun');
  });

  it('flags a third-person pronoun', () => {
    // cand-03 opened ~30 of 50 responses this way and was graded LOW.
    const found = assessLexical({
      instrument: 'wat',
      responses: ['He take risk'],
    });
    expect(rules(found)).toContain('wat_personal_pronoun');
  });

  it('passes impersonal aphoristic responses', () => {
    // cand-04 — the only candidate graded "V. good" on WAT.
    const found = assessLexical({
      instrument: 'wat',
      responses: [
        'Practice makes one perfect',
        'Risks leads to success',
        'Naughtiness brings liveliness in a person',
        'Leader has good qualities',
      ],
    });
    expect(found).toHaveLength(0);
  });

  it('does not match pronouns embedded in longer words', () => {
    const found = assessLexical({
      instrument: 'wat',
      responses: [
        'Heroism is admirable',
        'There is a solution to every problem',
        'Theft is punishable',
        'Hisses came from the snake pit',
      ],
    });
    expect(found).toHaveLength(0);
  });

  it('does not apply the pronoun rule to SRT, where "He" is required', () => {
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He will inform his senior and reach the camp'],
    });
    expect(rules(found)).not.toContain('wat_personal_pronoun');
  });
});

describe('reporting', () => {
  it('reports the 1-based ordinal of each offending response', () => {
    const found = assessLexical({
      instrument: 'wat',
      responses: ['Honesty is the best policy', 'My brother is my role model'],
    });
    expect(found).toHaveLength(1);
    expect(found[0].ordinal).toBe(2);
  });

  it('skips blank responses — those are Layer 1 findings, not Layer 2', () => {
    const found = assessLexical({
      instrument: 'wat',
      responses: [null, '   ', 'Truth always wins'],
    });
    expect(found).toHaveLength(0);
  });

  it('includes an excerpt so a reviewer can audit the match', () => {
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He must swim towards the shore'],
    });
    expect(found[0].excerpt).toMatch(/must/i);
  });
});
