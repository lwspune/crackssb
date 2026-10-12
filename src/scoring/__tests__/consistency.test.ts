import { describe, it, expect } from 'vitest';
import { findInconsistencies, normaliseSignal, readClaim } from '../consistency/engine.ts';
import type { CandidateProfile } from '../consistency/engine.ts';

/**
 * Layer 4 — the cross-instrument consistency engine.
 *
 * ARCHITECTURE.md section 3.3: "TAT, WAT, SRT, SDT and PIQ must describe the
 * same person, and contradictions between them are the finding, not an error."
 *
 * Every case below is real. cand-01's SDT claims he never panics and has
 * leader-type calibre, while his TAT story 11 is marked Scared / Restd courage
 * and his SRT is marked "Shows authoritarian Behaviour". Three instruments,
 * three different people.
 */

const profile = (over: Partial<CandidateProfile> = {}): CandidateProfile => ({
  candidateId: 'cand-01',
  instruments: [],
  ...over,
});

describe('signal normalisation', () => {
  it('collapses the assessor spelling variants of restricted courage', () => {
    for (const raw of [
      'Restd courage',
      'Restricted courage',
      'Restd/low COURAGE',
      'traces of Restd courage?',
      'Restricted (Restd) Courage',
      'Proceed to Restricted courage',
    ]) {
      expect(normaliseSignal(raw)).toBe('courage_restricted');
    }
  });

  it('collapses the anxiety cluster', () => {
    for (const raw of ['Highly Anxious', 'Anxious', 'paniced', 'Scared', 'Anxiety = v.High']) {
      expect(normaliseSignal(raw)).toBe('anxiety');
    }
  });

  it('collapses the temper cluster', () => {
    for (const raw of ['Short temper', 'Aggressive', 'Short fuse', 'Aggressiveness (short temper)']) {
      expect(normaliseSignal(raw)).toBe('temper');
    }
  });

  it('returns null for a mark that carries no personality signal', () => {
    expect(normaliseSignal('Poor Detailing')).toBeNull();
    expect(normaliseSignal('')).toBeNull();
  });
});

describe('reading a self-claim', () => {
  it('reads an affirmation', () => {
    expect(readClaim('I am a very big overthinker', 'overthinker')).toBe('affirms');
  });

  it('reads a denial', () => {
    expect(readClaim('a person who never panics in any situation', 'anxiety')).toBe('denies');
  });

  it('does NOT read "never panics" as admitting anxiety', () => {
    // The trap: the word "panic" is present, but negated. A naive contains()
    // check would invert the meaning of the whole finding.
    expect(readClaim('never panics in any situation', 'anxiety')).not.toBe('affirms');
  });

  it('handles other negators', () => {
    for (const text of [
      "I don't get angry",
      'I am not an aggressive person',
      'I never lose my temper',
    ]) {
      expect(readClaim(text, 'temper')).toBe('denies');
    }
  });

  it('returns null when the claim says nothing about the signal', () => {
    expect(readClaim('I like reading and solo trips', 'temper')).toBeNull();
  });
});

describe('contradictions', () => {
  it('finds cand-01 claiming calm while his TAT is marked Scared', () => {
    const found = findInconsistencies(
      profile({
        instruments: [
          {
            instrument: 'sdt',
            selfClaims: ['never panics in any situation', 'Never give up is my attitude'],
            traits: [],
            olqCodes: [],
          },
          { instrument: 'tat', traits: ['Scared'], olqCodes: ['Restd courage'] },
        ],
      }),
    );
    const c = found.find((f) => f.kind === 'contradiction' && f.signal === 'anxiety');
    expect(c).toBeDefined();
    expect(c!.claim.instrument).toBe('sdt');
    expect(c!.evidence.some((e) => e.instrument === 'tat')).toBe(true);
  });

  it('finds the leader claim contradicted by authoritarian behaviour', () => {
    // The words differ, so this needs the opposing-signal map, not term matching.
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['leader type caliber to lead a team'], traits: [], olqCodes: [] },
          { instrument: 'srt', traits: ['Shows authoritarian Behaviour'], olqCodes: [] },
        ],
      }),
    );
    expect(found.some((f) => f.kind === 'contradiction' && f.signal === 'authoritarian')).toBe(true);
  });

  it('finds a courage claim contradicted by restricted courage', () => {
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['I never give up, I am courageous'], traits: [], olqCodes: [] },
          { instrument: 'tat', traits: [], olqCodes: ['Restricted courage'] },
        ],
      }),
    );
    expect(found.some((f) => f.signal === 'courage_restricted' && f.kind === 'contradiction')).toBe(true);
  });

  it('cites evidence from every instrument that shows it', () => {
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['never panics'], traits: [], olqCodes: [] },
          { instrument: 'tat', traits: ['Highly Anxious'], olqCodes: [] },
          { instrument: 'srt', traits: ['Scared'], olqCodes: [] },
        ],
      }),
    );
    const c = found.find((f) => f.signal === 'anxiety')!;
    expect(c.evidence.map((e) => e.instrument).sort()).toEqual(['srt', 'tat']);
    expect(c.confidence).toBe('high'); // corroborated across two instruments
  });

  it('marks a single-instrument contradiction as medium confidence', () => {
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['never panics'], traits: [], olqCodes: [] },
          { instrument: 'tat', traits: ['Highly Anxious'], olqCodes: [] },
        ],
      }),
    );
    expect(found.find((f) => f.signal === 'anxiety')!.confidence).toBe('medium');
  });
});

describe('corroborations — self-awareness is a finding too', () => {
  it('reports agreement when cand-09 calls herself an overthinker and is marked one', () => {
    // The assessor grades SDT on insight. A self-description that MATCHES the
    // projective evidence is evidence of insight, not an absence of a finding.
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['I think that I am a very big overthinker'], traits: [], olqCodes: [] },
          { instrument: 'tat', traits: ['Overthinker'], olqCodes: [] },
        ],
      }),
    );
    expect(found.some((f) => f.kind === 'corroboration' && f.signal === 'overthinker')).toBe(true);
  });

  it('treats admitted anger as insight rather than contradiction', () => {
    // cand-01's SDT admits "I am an angry person". The assessor still flags temper,
    // but the candidate saw it coming — that is not a contradiction.
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['I am an angry person who can not give up'], traits: [], olqCodes: [] },
          { instrument: 'tat', traits: ['Short temper'], olqCodes: [] },
        ],
      }),
    );
    expect(found.some((f) => f.kind === 'corroboration' && f.signal === 'temper')).toBe(true);
    expect(found.some((f) => f.kind === 'contradiction' && f.signal === 'temper')).toBe(false);
  });
});

describe('not over-firing', () => {
  it('raises nothing when there is no claim to contradict', () => {
    const found = findInconsistencies(
      profile({ instruments: [{ instrument: 'tat', traits: ['Highly Anxious'], olqCodes: [] }] }),
    );
    expect(found).toEqual([]);
  });

  it('raises nothing when there is no evidence for the claim', () => {
    const found = findInconsistencies(
      profile({
        instruments: [{ instrument: 'sdt', selfClaims: ['never panics'], traits: [], olqCodes: [] }],
      }),
    );
    expect(found).toEqual([]);
  });

  it('ignores evidence from the SAME instrument as the claim', () => {
    // A single instrument disagreeing with itself is a marking artefact, not a
    // cross-instrument finding. The whole value here is triangulation.
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['never panics'], traits: ['Highly Anxious'], olqCodes: [] },
        ],
      }),
    );
    expect(found).toEqual([]);
  });

  it('does not invent a signal from unrelated marks', () => {
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['I am organised and punctual'], traits: [], olqCodes: [] },
          { instrument: 'tat', traits: [], olqCodes: ['Poor Detailing', 'Low EI / RA'] },
        ],
      }),
    );
    expect(found).toEqual([]);
  });

  it('reports each signal once, however many marks carry it', () => {
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['never panics'], traits: [], olqCodes: [] },
          { instrument: 'tat', traits: ['Highly Anxious', 'Scared', 'Anxious'], olqCodes: [] },
        ],
      }),
    );
    expect(found.filter((f) => f.signal === 'anxiety')).toHaveLength(1);
  });
});

/**
 * Regressions found by running the engine over the real corpus. Each of these
 * produced a wrong or confusing finding on a real candidate.
 */
describe('regressions from the corpus run', () => {
  it('does not let a negator from an earlier clause bleed into the next', () => {
    // cand-01: "...never panics in any situation. Never give up is my attitude."
    // A 40-character look-back caught the "never" from the PREVIOUS sentence and
    // flipped "never give up" into an admission of restricted courage.
    const text = "he never panics in any situation. 'Never give up' is my attitude";
    expect(readClaim(text, 'courage_restricted')).toBe('denies');
  });

  it('still reads a negator inside the same clause', () => {
    expect(readClaim('I am not a courageous person', 'courage_restricted')).toBe('affirms');
  });

  it('suppresses a contradiction the candidate owns up to in a DIFFERENT sentence', () => {
    // cand-01 denies being directive in one opinion and admits "they think I
    // dominate the group" in another. Reporting both a contradiction and a
    // corroboration for the same signal is incoherent; the admission wins.
    const found = findInconsistencies(
      profile({
        instruments: [
          {
            instrument: 'sdt',
            selfClaims: [
              'I am a leader, ready to learn new things',
              'They think I dominate the group and use bad language',
            ],
            traits: [],
            olqCodes: [],
          },
          { instrument: 'srt', traits: ['Shows authoritarian Behaviour'], olqCodes: [] },
        ],
      }),
    );
    const authoritarian = found.filter((f) => f.signal === 'authoritarian');
    expect(authoritarian).toHaveLength(1);
    expect(authoritarian[0].kind).toBe('corroboration');
  });

  it('does not repeat identical evidence', () => {
    // "Confused" appears on several TAT stories; it is one piece of evidence.
    const found = findInconsistencies(
      profile({
        instruments: [
          { instrument: 'sdt', selfClaims: ['I am a very organised person'], traits: [], olqCodes: [] },
          { instrument: 'tat', traits: [], olqCodes: ['Confused', 'Confused', 'confused'] },
        ],
      }),
    );
    const c = found.find((f) => f.signal === 'disorganised')!;
    expect(c.evidence).toHaveLength(1);
  });

  it('reads "overbearing" as a temper claim', () => {
    // cand-04 writes "a bit overbearing who wants things to go by his ideas".
    expect(readClaim('But a bit overbearing who wants things his way', 'temper')).toBe('affirms');
  });
});
