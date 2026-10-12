import { describe, it, expect } from 'vitest';
import { validateVerdict, ENTITLEMENTS, OLQS } from '../judge/contract.ts';

/**
 * The D5 adapter contract: text in, validated partial OLQ vector out.
 *
 * ARCHITECTURE.md section 3.1 is explicit that an evaluation returning an OLQ
 * outside its instrument's entitlement is "rejected at the boundary, not
 * filtered downstream". These tests hold that line.
 *
 * DECISIONS.md D11 requires quality and OLQ/flags to be independent outputs,
 * so a verdict must carry both and neither may be derived from the other.
 */

const valid = () => ({
  quality: { grade: 'LOW' as const, evidence: ['Story left without a resolution'] },
  olq: {
    courage: { score: 3, confidence: 0.7, evidence: ['Hero is rescued by a passer-by'] },
  },
  flags: { themes: [], traits: ['Cynophobia'], perceptionMismatch: null },
});

describe('entitlement map', () => {
  it('defines an entitlement for every instrument', () => {
    for (const k of ['tat', 'wat', 'srt', 'sdt'] as const) {
      expect(ENTITLEMENTS[k].length).toBeGreaterThan(0);
    }
  });

  it('only ever names real OLQs', () => {
    for (const list of Object.values(ENTITLEMENTS)) {
      for (const olq of list) expect(OLQS).toContain(olq);
    }
  });

  it('does not let WAT speak to Courage', () => {
    // A 15-second word association cannot observe courage. This is the exact
    // failure mode D4 exists to prevent.
    expect(ENTITLEMENTS.wat).not.toContain('courage');
  });

  it('lets TAT speak to Courage, which the corpus shows the assessor doing', () => {
    // "Restd courage" appears on seven TAT sheets.
    expect(ENTITLEMENTS.tat).toContain('courage');
  });
});

describe('validateVerdict', () => {
  it('accepts a well-formed verdict', () => {
    expect(() => validateVerdict('tat', valid())).not.toThrow();
  });

  it('REJECTS an OLQ outside the instrument entitlement', () => {
    const v = { ...valid(), olq: { speedOfDecision: { score: 4, confidence: 0.5, evidence: ['x'] } } };
    expect(() => validateVerdict('wat', v)).toThrow(/not entitled/i);
  });

  it('names the offending OLQ in the rejection', () => {
    const v = { ...valid(), olq: { stamina: { score: 4, confidence: 0.5, evidence: ['x'] } } };
    expect(() => validateVerdict('wat', v)).toThrow(/stamina/i);
  });

  it('rejects an unknown OLQ key outright', () => {
    const v = { ...valid(), olq: { charisma: { score: 5, confidence: 0.5, evidence: ['x'] } } };
    expect(() => validateVerdict('tat', v)).toThrow(/unknown olq/i);
  });

  it('rejects a score outside the 1-9 assessor scale', () => {
    for (const score of [0, 10, -1, 4.5]) {
      const v = { ...valid(), olq: { courage: { score, confidence: 0.5, evidence: ['x'] } } };
      expect(() => validateVerdict('tat', v)).toThrow(/score/i);
    }
  });

  it('rejects a confidence outside 0..1', () => {
    const v = { ...valid(), olq: { courage: { score: 5, confidence: 1.4, evidence: ['x'] } } };
    expect(() => validateVerdict('tat', v)).toThrow(/confidence/i);
  });

  it('rejects a score with no evidence — every score carries its justification', () => {
    const v = { ...valid(), olq: { courage: { score: 5, confidence: 0.5, evidence: [] } } };
    expect(() => validateVerdict('tat', v)).toThrow(/evidence/i);
  });

  it('rejects a grade outside the assessor closed vocabulary', () => {
    const v = { ...valid(), quality: { grade: 'Excellent', evidence: ['x'] } };
    // @ts-expect-error deliberately invalid grade
    expect(() => validateVerdict('tat', v)).toThrow(/grade/i);
  });

  it('accepts an empty OLQ vector — partial means partial', () => {
    const v = { ...valid(), olq: {} };
    expect(() => validateVerdict('tat', v)).not.toThrow();
  });

  it('requires both independent outputs to be present', () => {
    const noQuality = { olq: {}, flags: { themes: [], traits: [], perceptionMismatch: null } };
    // @ts-expect-error missing quality
    expect(() => validateVerdict('tat', noQuality)).toThrow(/quality/i);

    const noFlags = { quality: { grade: 'LOW', evidence: ['x'] }, olq: {} };
    // @ts-expect-error missing flags
    expect(() => validateVerdict('tat', noFlags)).toThrow(/flags/i);
  });

  it('allows a negative flag alongside a passing grade (D11 orthogonality)', () => {
    // Slide 11 in the corpus: ticked as a story, Restd courage as a finding.
    const v = {
      quality: { grade: 'Good' as const, evidence: ['Coherent, resolved'] },
      olq: { courage: { score: 3, confidence: 0.8, evidence: ['Hero waits for rescue'] } },
      flags: { themes: [], traits: ['Cynophobia'], perceptionMismatch: null },
    };
    expect(() => validateVerdict('tat', v)).not.toThrow();
  });
});
