import {
  assertValidInput,
  isBlank,
  wordCount,
  type Instrument,
} from './thresholds.ts';

/**
 * Layer 1 — counts and thresholds. Deterministic, no model, no hallucination surface.
 *
 * In the LWS Pune corpus this layer alone accounts for the heaviest marks on most
 * sheets: five of nine candidates attempted exactly 16 SRT against a stated target
 * of 45, and no candidate exceeded 29.
 */

export type CompletenessCode =
  | 'attempts_below_target'
  | 'blank_responses'
  | 'incomplete_opinions'
  | 'opinion_too_short';

export interface CompletenessFinding {
  readonly code: CompletenessCode;
  readonly severity: 'low' | 'medium' | 'high';
  readonly observed: number;
  readonly expected: number;
  readonly message: string;
  /** 1-based, present only where the finding attaches to one response. */
  readonly ordinal?: number;
}

export interface CompletenessInput {
  readonly instrument: Instrument;
  readonly responses: readonly (string | null | undefined)[];
}

/** Shortfall against target, scaled. Kept here so severity is one rule, not four. */
function severityForShortfall(observed: number, expected: number): 'low' | 'medium' | 'high' {
  if (expected <= 0) return 'low';
  const ratio = observed / expected;
  if (ratio < 0.5) return 'high';
  if (ratio < 0.85) return 'medium';
  return 'low';
}

export function assessCompleteness({
  instrument,
  responses,
}: CompletenessInput): CompletenessFinding[] {
  const spec = assertValidInput(instrument, responses);
  const findings: CompletenessFinding[] = [];

  const attempted = responses.filter((r) => !isBlank(r)).length;
  const blanks = spec.items - attempted;

  if (spec.attemptTarget < spec.items) {
    // The assessor sets a target below the booklet length — SRT only. The
    // meaningful finding is the shortfall, not the unused items.
    if (attempted < spec.attemptTarget) {
      findings.push({
        code: 'attempts_below_target',
        severity: severityForShortfall(attempted, spec.attemptTarget),
        observed: attempted,
        expected: spec.attemptTarget,
        message: `Only ${attempted} ${instrument.toUpperCase()} attempted. You need to do ${spec.attemptTarget}+.`,
      });
    }
  } else if (instrument === 'sdt') {
    if (attempted < spec.items) {
      findings.push({
        code: 'incomplete_opinions',
        severity: severityForShortfall(attempted, spec.items),
        observed: attempted,
        expected: spec.items,
        message: `Only ${attempted} of ${spec.items} opinions written. Please complete all the opinions.`,
      });
    }
  } else if (blanks > 0) {
    findings.push({
      code: 'blank_responses',
      severity: severityForShortfall(attempted, spec.items),
      observed: blanks,
      expected: 0,
      message: `${String(blanks).padStart(2, '0')} ${instrument.toUpperCase()} not attempted.`,
    });
  }

  // Per-response length rule, where the assessor stated one. Blank responses are
  // already reported above; reporting them again as "too short" would double-count.
  const minWords = spec.minWordsPerResponse;
  if (minWords != null) {
    responses.forEach((response, index) => {
      if (isBlank(response)) return;
      const words = wordCount(response as string);
      if (words < minWords) {
        findings.push({
          code: 'opinion_too_short',
          severity: severityForShortfall(words, minWords),
          observed: words,
          expected: minWords,
          ordinal: index + 1,
          message: `Opinion ${index + 1} runs to ${words} words. Write much more — about ${minWords}-90 words (6-7 lines) under each opinion.`,
        });
      }
    });
  }

  return findings;
}
