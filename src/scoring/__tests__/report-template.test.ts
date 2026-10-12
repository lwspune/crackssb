import { describe, it, expect } from 'vitest';
import {
  FRAMES, SLOTS, SECTIONS, NEVER_IN_REPORT,
  isBoilerplate, isWithheldFromReport, matchFrame,
} from '../report/template.ts';

/**
 * Holds the report-generation findings as assertions rather than prose.
 *
 * Derived from the only two real reports in the corpus. The point is that a
 * generator built later cannot quietly violate what was learned here.
 */

describe('frames recur, but their qualifiers move with the candidate', () => {
  // CORRECTED after cand-09's report falsified the two-sample reading.
  // These sentences looked like fixed text across two weak candidates; the
  // strong candidate moved every one of them.

  it('treats the cheerfulness sentence as MODULATED, not fixed', () => {
    // "maintain cheerfulness at all times" -> "maintains cheerfulness ALMOST
    // at all times". One word, and it is a judgement about the candidate.
    const f = matchFrame('She maintains cheerfulness almost at all times.');
    expect(f?.modulated).toBe(true);
    expect(isBoilerplate('She maintains cheerfulness almost at all times.')).toBe(false);
  });

  it('treats the courage sentence as modulated — the parenthetical is a finding', () => {
    // Weak candidates: "bolder in risky situations (shows traces of restricted
    // courage)". Strong candidate: the parenthetical is simply dropped.
    const f = matchFrame('She can be more bolder in few dynamics & risky situations.');
    expect(f?.modulated).toBe(true);
    expect(f?.observedVariants?.some((v) => v.includes('restricted courage'))).toBe(true);
  });

  it('treats the stamina sentence as modulated', () => {
    // "low average" -> "just average" to withstand prolong tasking.
    expect(matchFrame('Her mental awareness is just average to withstand prolong tasking')?.modulated).toBe(true);
  });

  it('still recognises the few frames that have NOT moved across three reports', () => {
    expect(isBoilerplate('The candidate is advised to broaden her knowledge base.')).toBe(true);
    expect(isBoilerplate('actions need to be factual & grounded to reality')).toBe(true);
  });

  it('does not match a candidate-specific sentence to any frame', () => {
    expect(matchFrame('She attempted only 27 SRT')).toBeNull();
    expect(matchFrame('01 TAT story is not connected with picture presented')).toBeNull();
  });

  it('records both observed variants for every modulated frame', () => {
    for (const f of FRAMES.filter((x) => x.modulated)) {
      expect(f.observedVariants?.length, f.stem).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('what three reports taught that two could not', () => {
  it('knows intelligence has an upper value, invisible until a strong candidate', () => {
    expect(SLOTS.intelligence.observed).toContain('just mediocre');
    expect(SLOTS.intelligence.observed).toContain('adequate');
  });

  it('records that trainability does NOT discriminate', () => {
    // Low-Borderliner, High Borderliner and High Borderline all scored
    // "adequate". At n=3 the field carries no information.
    expect(SLOTS.trainability.observed).toEqual(['adequate']);
    expect(SLOTS.trainability.note).toMatch(/does not discriminate/i);
  });

  it('has the three enumerated bands, now a closed scale', () => {
    // The batch grading summary lists every candidate against one of three
    // bands: High-Borderliner (2), Borderliner (2), Low-Borderliner (7).
    expect(SLOTS.standing.observed).toEqual(['Low-Borderliner', 'Borderliner', 'High-Borderliner']);
    expect(SLOTS.standing.closed).toBe(true);
  });

  it('records that the withholding filter is a default, not an observed rule', () => {
    // The trait block withheld from one candidate's report appears in another's:
    // "shows traces of trust issues with opposite gender - slight shy".
    expect(SLOTS.standing.note).toMatch(/enumerated/i);
  });
});

describe('the discretion filter', () => {
  it('withholds the SDT trait block, which reached no part of either report', () => {
    for (const mark of [
      'Short fuse', 'Aggressiveness (short temper)', 'Impulsiveness',
      'Trust issue especially with opposite Gender',
    ]) {
      expect(isWithheldFromReport(mark), mark).toBe(true);
    }
  });

  it('withholds "Shows authoritarian Behaviour"', () => {
    // Struck through on all 16 of cand-01's attempted SRT responses; absent from
    // his report. Coaching correction, not an assessment finding (D14).
    expect(isWithheldFromReport('Shows authoritarian Behaviour')).toBe(true);
  });

  it('withholds phobia labels, which are stimulus-driven anyway', () => {
    expect(isWithheldFromReport('Cynophobia')).toBe(true);
  });

  it('does NOT withhold the things both reports actually say', () => {
    for (const mark of [
      'restricted courage', 'restricted Mental Stamina',
      'high anxiousness', 'limited Insight',
    ]) {
      expect(isWithheldFromReport(mark), mark).toBe(false);
    }
  });
});

describe('slots', () => {
  it('records every slot with at least one observed value', () => {
    for (const slot of Object.values(SLOTS)) {
      expect(slot.observed.length).toBeGreaterThan(0);
    }
  });

  it('closes only the vocabulary a full enumeration was seen for', () => {
    const closed = Object.values(SLOTS).filter((s) => s.closed).map((s) => s.id);
    expect(closed).toEqual(['standing']);
  });

  it('keeps standing and trainability as separate slots', () => {
    // A Low-Borderliner and a High Borderliner both scored "adequate"
    // trainability, so one cannot be derived from the other.
    expect(SLOTS.standing.id).not.toBe(SLOTS.trainability.id);
    expect(SLOTS.trainability.observed).toContain('adequate');
    expect(SLOTS.standing.note).toMatch(/do not emit/i);
  });

  it('orders the assistance slot weakest-first, which is a real judgement', () => {
    // "demanding assistance" (cand-01, Low-Borderliner) vs "seeking assistance"
    // (cand-04, High Borderliner).
    expect(SLOTS.assistance.observed[0]).toBe('demanding');
  });
});

describe('structure', () => {
  it('fixes the section order both reports used', () => {
    expect(SECTIONS).toEqual(['tat', 'wat', 'srt', 'sd', 'summarizing', 'verdict']);
  });

  it('lists withheld mark patterns', () => {
    expect(NEVER_IN_REPORT.length).toBeGreaterThanOrEqual(8);
  });
});

/**
 * Calibration measured against the assessor's reports.
 * See corpus/predictions/batch-SCORED.md.
 */
describe('theme calibration', () => {
  it('records the observed low-theme base rate', async () => {
    const { LOW_THEME_BASE_RATE, UNCALIBRATED_RATE } = await import('../judge/calibration.ts');
    // 64 of 124 written stories across 11 assessor reports.
    expect(LOW_THEME_BASE_RATE).toBeCloseTo(0.516, 2);
    // What the same responses produced without a base rate to anchor against.
    expect(UNCALIBRATED_RATE).toBeCloseTo(0.295, 2);
    expect(LOW_THEME_BASE_RATE).toBeGreaterThan(UNCALIBRATED_RATE);
  });

  it('puts the base rate into the TAT rubric, where a judge will see it', async () => {
    const { buildRubric } = await import('../judge/rubric.ts');
    const tat = buildRubric('tat');
    expect(tat).toMatch(/52% of written stories were judged low-theme/);
    expect(tat).toMatch(/closer to the default than the exception/i);
  });

  it('tells the judge that incompleteness belongs IN the theme band', async () => {
    const { buildRubric } = await import('../judge/rubric.ts');
    expect(buildRubric('tat')).toMatch(/Incompleteness counts as a low theme, not as a separate fault/i);
  });

  it('warns that volume is not quality', async () => {
    const { buildRubric } = await import('../judge/rubric.ts');
    expect(buildRubric('tat')).toMatch(/Volume is not quality/i);
  });

  it('keeps the calibration out of the other instruments', async () => {
    const { buildRubric } = await import('../judge/rubric.ts');
    expect(buildRubric('wat')).not.toMatch(/low-theme/i);
  });
});

describe('the record is ready for a second assessor', () => {
  it('names which rater the calibration came from', async () => {
    const { CALIBRATION_SOURCES, IS_SINGLE_RATER } = await import('../judge/calibration.ts');
    expect(CALIBRATION_SOURCES[0].assessor).toBe('yogesh-dutta');
    expect(IS_SINGLE_RATER).toBe(true);
  });

  it('marks the base rate provisional while there is only one rater', async () => {
    const { BASE_RATE_IS_PROVISIONAL } = await import('../judge/calibration.ts');
    // Flips to false automatically once a second source is added, which is the
    // signal to recompute per rater rather than pooling.
    expect(BASE_RATE_IS_PROVISIONAL).toBe(true);
  });

  it('tells the judge the rate comes from a single marker', async () => {
    const { buildRubric } = await import('../judge/rubric.ts');
    expect(buildRubric('tat')).toMatch(/measured from a single marker/i);
  });
});
