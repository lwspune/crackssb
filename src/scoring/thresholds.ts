/**
 * Instrument thresholds, derived from the LWS Pune corpus (11 sheets, 31 July 2026).
 *
 * These are the assessor's own stated standards, not invented targets. Where a
 * number appears here, the assessor wrote it on a sheet in red ink. See
 * `corpus/CODEBOOK.md` for the evidence behind each one.
 */

export type Instrument = 'tat' | 'wat' | 'srt' | 'sdt';

export interface InstrumentSpec {
  /** Items in the booklet. */
  readonly items: number;
  /** Attempts the assessor expects. Below `items` only where he says so. */
  readonly attemptTarget: number;
  /** Minimum words per response, where the assessor stated one. */
  readonly minWordsPerResponse?: number;
}

export const INSTRUMENT_SPECS: Readonly<Record<Instrument, InstrumentSpec>> = {
  // 12 slides, all expected. "Also, you need to complete the 12 TAT stories."
  tat: { items: 12, attemptTarget: 12 },

  // 60 words. Blanks tallied per page and summed: "10 WAT Not Attempted".
  wat: { items: 60, attemptTarget: 60 },

  // 60 situations, but the stated target is lower and explicit, on five separate
  // sheets: "You Need to do 45+ SRT". No candidate in the corpus exceeded 29.
  srt: { items: 60, attemptTarget: 45 },

  // 5 opinions. "You Need to write much more, about 80-90 words (6-7 lines)
  // under each opinion."
  sdt: { items: 5, attemptTarget: 5, minWordsPerResponse: 80 },
};

export function specFor(instrument: Instrument): InstrumentSpec {
  const spec = INSTRUMENT_SPECS[instrument];
  if (!spec) throw new Error(`Unknown instrument: ${String(instrument)}`);
  return spec;
}

/** A response the candidate did not write. Layer 1's concern, never Layer 2's. */
export function isBlank(response: string | null | undefined): boolean {
  return response == null || response.trim() === '';
}

export function wordCount(response: string): number {
  return response.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Fail fast at the boundary, before any counting — per ARCHITECTURE.md section 5.
 */
export function assertValidInput(instrument: Instrument, responses: readonly unknown[]): InstrumentSpec {
  const spec = specFor(instrument);
  if (!Array.isArray(responses)) {
    throw new TypeError(`${instrument}: responses must be an array`);
  }
  if (responses.length > spec.items) {
    throw new RangeError(
      `${instrument} expects at most ${spec.items} responses, received ${responses.length}`,
    );
  }
  return spec;
}
