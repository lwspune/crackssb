import { describe, it, expect } from 'vitest';
import { assessLexical } from '../lexical.ts';

/**
 * Layer 2, second pass — two further rules the corpus surfaced during the
 * full transcription. Both are stated explicitly by the assessor in red pen.
 */

const rules = (fs: { rule: string }[]) => fs.map((f) => f.rule);

describe('WhatsApp abbreviations', () => {
  it('flags "bcoz"', () => {
    // cand-11 cand-11, TAT 1. Assessor: "Pls Restrict using WHATSAPP short-cut abbreviated words".
    const found = assessLexical({
      instrument: 'tat',
      responses: ['She got up bcoz she was drawing straight 10 hrs'],
    });
    expect(rules(found)).toContain('whatsapp_abbreviation');
    expect(found[0].suggestion).toMatch(/full/i);
  });

  it('flags "abt"', () => {
    // cand-11 cand-11, TAT 12.
    const found = assessLexical({
      instrument: 'tat',
      responses: ['When he get into NDA abt 3 yrs'],
    });
    expect(rules(found)).toContain('whatsapp_abbreviation');
  });

  it('reports each distinct abbreviation in a response', () => {
    const found = assessLexical({
      instrument: 'tat',
      responses: ['bcoz he was late abt 2 hrs'],
    });
    expect(found.filter((f) => f.rule === 'whatsapp_abbreviation')).toHaveLength(2);
  });

  it('does not flag ordinary prose', () => {
    const found = assessLexical({
      instrument: 'tat',
      responses: ['Because she was drawing for ten hours she took a short break'],
    });
    expect(found).toHaveLength(0);
  });

  it('does not match abbreviations embedded in longer words', () => {
    const found = assessLexical({
      instrument: 'tat',
      responses: ['The urn was about to fall and the rugby team ran'],
    });
    expect(rules(found)).not.toContain('whatsapp_abbreviation');
  });
});

describe('definite article before a proper name', () => {
  it('flags "the Ram"', () => {
    // cand-07 cand-07, TAT 2 and 5. Assessor, twice: "THE is a definite Article,
    // cannot be prefixed to Standard Names (Noun) such as Ram, Sita, Savita, Dhoni".
    const found = assessLexical({
      instrument: 'tat',
      responses: ['Then the Ram saw the kidnapper and called the police'],
    });
    expect(rules(found)).toContain('definite_article_before_name');
  });

  it('flags "the Geeta"', () => {
    // cand-07 cand-07, TAT 10.
    const found = assessLexical({
      instrument: 'tat',
      responses: ['The Geeta is so depressed, she ask to Krishna why'],
    });
    expect(rules(found)).toContain('definite_article_before_name');
  });

  it('does not flag a demonym or a capitalised adjective', () => {
    // cand-08 Chodhary, TAT 4 — "the Indian army", "the American country".
    const found = assessLexical({
      instrument: 'tat',
      responses: [
        'After this attack the Indian army decided to attack back',
        'She is representing her company in front of the American country',
      ],
    });
    expect(rules(found)).not.toContain('definite_article_before_name');
  });

  it('does not flag a sentence-initial "The"', () => {
    const found = assessLexical({
      instrument: 'tat',
      responses: ['The picture depicts four soldiers climbing a rocky hill'],
    });
    expect(found).toHaveLength(0);
  });

  it('does not flag "the" before a lowercase noun', () => {
    const found = assessLexical({
      instrument: 'tat',
      responses: ['He reached the hospital and gave the injured lady first aid'],
    });
    expect(found).toHaveLength(0);
  });

  it('accepts an explicit character list when the caller has one', () => {
    const found = assessLexical({
      instrument: 'tat',
      responses: ['Then the Zoya went to the Headquarters'],
      characterNames: ['Zoya'],
    });
    const hits = found.filter((f) => f.rule === 'definite_article_before_name');
    expect(hits).toHaveLength(1);
    expect(hits[0].excerpt).toMatch(/Zoya/);
  });
});

/**
 * Doctrine vs house style.
 *
 * LWS Pune confirmed there was one assessor and no second marker, which makes
 * the inconsistent application of the tense rule one person being inconsistent
 * with himself — the signature of a situational heuristic, not a standard.
 * See DECISIONS.md D14.
 */
describe('every finding declares whether it is doctrine or house style', () => {
  const basisOf = (instrument: 'srt' | 'wat' | 'tat', response: string, rule: string) => {
    const f = assessLexical({ instrument, responses: [response] }).find((x) => x.rule === rule);
    expect(f, `expected rule ${rule} to fire`).toBeDefined();
    return f!.basis;
  };

  it('treats modal obligation as doctrine', () => {
    // Prescribing what someone ought to do, rather than committing to an action.
    // The assessor paired this with "Shows authoritarian Behaviour" both times
    // he wrote the instruction out.
    expect(basisOf('srt', 'He must take loan from the bank', 'srt_modal_obligation')).toBe('doctrine');
  });

  it('treats tentative verbs as doctrine', () => {
    // "Avoid TRY / TRIED" appears on three separate sheets — it is about
    // decisiveness, which is a quality being assessed.
    expect(basisOf('srt', 'He will try to block the hole', 'tentative_verb')).toBe('doctrine');
  });

  it('treats non-future tense as HOUSE STYLE, not doctrine', () => {
    // Corrected 15/16 times on cand-05, not at all on cand-09 and cand-02 writing
    // the same way. One assessor, applied three different ways.
    expect(basisOf('srt', 'He took the purse to the police station', 'srt_non_future')).toBe('house_style');
  });

  it('treats the WAT pronoun rule as house style', () => {
    expect(basisOf('wat', 'My sister is very naughty', 'wat_personal_pronoun')).toBe('house_style');
  });

  it('treats WhatsApp abbreviations as house style', () => {
    expect(basisOf('tat', 'She got up bcoz she was tired', 'whatsapp_abbreviation')).toBe('house_style');
  });

  it('treats an article before a proper name as a grammar error', () => {
    expect(basisOf('tat', 'Then the Ram saw the kidnapper', 'definite_article_before_name')).toBe('grammar');
  });

  it('gives a basis to every finding it emits', () => {
    const found = assessLexical({
      instrument: 'srt',
      responses: ['He must try to help', 'He took the bag', 'bcoz he was late'],
    });
    expect(found.length).toBeGreaterThan(0);
    for (const f of found) {
      expect(['doctrine', 'house_style', 'grammar']).toContain(f.basis);
    }
  });
});
