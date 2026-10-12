import type { Instrument } from '../thresholds.ts';
import {
  CLAIM_TERMS,
  DEFICIT_SIGNALS,
  OPPOSING_CLAIMS,
  SIGNAL_LABELS,
  normaliseSignal,
  type Signal,
} from './signals.ts';

export { normaliseSignal, type Signal } from './signals.ts';

/**
 * Layer 4 — the cross-instrument consistency engine.
 *
 * ARCHITECTURE.md section 3.3: the differentiator is that TAT, WAT, SRT and SDT
 * must describe the same person, and "contradictions between them are the
 * finding, not an error".
 *
 * This layer needs no model. It compares structured marks, so it runs on the
 * corpus ground truth today and on Layer 3's output later, unchanged.
 */

export interface InstrumentFindings {
  readonly instrument: Instrument;
  /** Candidate's own words. SDT only in practice. */
  readonly selfClaims?: readonly string[];
  readonly traits?: readonly string[];
  readonly olqCodes?: readonly string[];
}

export interface CandidateProfile {
  readonly candidateId: string;
  readonly instruments: readonly InstrumentFindings[];
}

export interface Inconsistency {
  readonly kind: 'contradiction' | 'corroboration';
  readonly signal: Signal;
  readonly claim: { readonly text: string; readonly instrument: Instrument };
  readonly evidence: ReadonlyArray<{ readonly text: string; readonly instrument: Instrument }>;
  /** High when two or more separate instruments show it. */
  readonly confidence: 'high' | 'medium';
  readonly explanation: string;
}

const NEGATOR = /\b(?:never|not|no|n't|dont|don't|doesn't|didn't|without|rarely|hardly)\b/i;

/**
 * Does a self-claim affirm or deny a signal?
 *
 * The negation check is load-bearing. cand-01 writes "never panics in any
 * situation" — a plain substring match on "panic" would read that as an
 * admission of anxiety and inverts the entire finding.
 */
export function readClaim(text: string, signal: Signal): 'affirms' | 'denies' | null {
  const term = CLAIM_TERMS[signal];
  if (!term) return null;
  const match = term.exec(text);
  if (!match) return null;

  // Look back only to the start of the current clause. cand-01 writes
  // "...never panics in any situation. 'Never give up' is my attitude" — a
  // fixed-width look-back caught the "never" from the previous sentence and
  // inverted the finding. Clause boundaries stop that bleed.
  const before = text.slice(0, match.index);
  const clauseStart = Math.max(
    before.lastIndexOf('.'),
    before.lastIndexOf(';'),
    before.lastIndexOf(','),
    before.lastIndexOf(' but '),
    before.lastIndexOf(' and '),
  );
  const negated = NEGATOR.test(before.slice(clauseStart + 1));

  // For a deficit-named signal the claim vocabulary describes the asset, so the
  // polarity flips: "I am courageous" DENIES restricted courage.
  if (DEFICIT_SIGNALS.has(signal)) return negated ? 'affirms' : 'denies';
  return negated ? 'denies' : 'affirms';
}

interface Mark {
  readonly text: string;
  readonly instrument: Instrument;
  readonly signal: Signal;
}

function collectMarks(profile: CandidateProfile): Mark[] {
  const marks: Mark[] = [];
  for (const f of profile.instruments) {
    for (const raw of [...(f.traits ?? []), ...(f.olqCodes ?? [])]) {
      const signal = normaliseSignal(raw);
      if (signal) marks.push({ text: raw, instrument: f.instrument, signal });
    }
  }
  return marks;
}

export function findInconsistencies(profile: CandidateProfile): Inconsistency[] {
  const marks = collectMarks(profile);
  if (marks.length === 0) return [];

  const out: Inconsistency[] = [];
  // One finding per (claim instrument, signal, kind) — several marks carrying
  // the same signal are evidence for one finding, not several findings.
  const seen = new Set<string>();

  /**
   * Signals the candidate admits to ANYWHERE in their self-description.
   *
   * You cannot contradict someone who owned up to it. cand-01 denies being
   * directive in one opinion and writes "they think I dominate the group" in
   * another; reporting both a contradiction and a corroboration for that is
   * incoherent, and the admission is the truer reading.
   */
  const admitted = new Set<Signal>();
  for (const source of profile.instruments) {
    for (const claimText of source.selfClaims ?? []) {
      for (const signal of Object.keys(CLAIM_TERMS) as Signal[]) {
        if (readClaim(claimText, signal) === 'affirms') admitted.add(signal);
      }
    }
  }

  for (const source of profile.instruments) {
    for (const claimText of source.selfClaims ?? []) {
      /** Evidence must come from a DIFFERENT instrument; triangulation is the point. */
      const evidenceFor = (signal: Signal) =>
        marks.filter((m) => m.signal === signal && m.instrument !== source.instrument);

      const record = (
        kind: Inconsistency['kind'],
        signal: Signal,
        evidence: Mark[],
        explanation: string,
      ) => {
        if (evidence.length === 0) return;
        if (kind === 'contradiction' && admitted.has(signal)) return;
        const key = `${source.instrument}|${signal}|${kind}`;
        if (seen.has(key)) return;
        seen.add(key);

        // The same mark recurs across stories; it is one piece of evidence.
        const byText = new Map<string, Mark>();
        for (const e of evidence) {
          const k = `${e.instrument}|${e.text.toLowerCase().trim()}`;
          if (!byText.has(k)) byText.set(k, e);
        }
        const unique = [...byText.values()];
        const instruments = new Set(unique.map((e) => e.instrument));
        out.push({
          kind,
          signal,
          claim: { text: claimText, instrument: source.instrument },
          evidence: unique.map((e) => ({ text: e.text, instrument: e.instrument })),
          confidence: instruments.size >= 2 ? 'high' : 'medium',
          explanation,
        });
      };

      // 1. Direct: the claim names the signal itself.
      for (const signal of Object.keys(CLAIM_TERMS) as Signal[]) {
        const stance = readClaim(claimText, signal);
        if (stance === 'denies') {
          record(
            'contradiction',
            signal,
            evidenceFor(signal),
            `Self-description denies ${SIGNAL_LABELS[signal]}, but it is marked elsewhere.`,
          );
        } else if (stance === 'affirms') {
          record(
            'corroboration',
            signal,
            evidenceFor(signal),
            `Self-description acknowledges ${SIGNAL_LABELS[signal]}, and it is marked elsewhere — evidence of insight.`,
          );
        }
      }

      // 2. Indirect: the claim and its contradiction are worded differently.
      for (const rule of OPPOSING_CLAIMS) {
        if (!rule.claim.test(claimText)) continue;
        // Don't raise a contradiction the candidate already owned up to.
        if (admitted.has(rule.contradictedBy)) continue;
        record(
          'contradiction',
          rule.contradictedBy,
          evidenceFor(rule.contradictedBy),
          `Self-description ${rule.why}.`,
        );
      }
    }
  }

  // Contradictions first, strongest evidence first — the ordering a reviewer wants.
  return out.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'contradiction' ? -1 : 1;
    if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
    return b.evidence.length - a.evidence.length;
  });
}
