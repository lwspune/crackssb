import { INSTRUMENT_CONFIGS } from '../../runner/modes.ts';
import type { RunnerConfig, RunnerInstrument } from '../../runner/modes.ts';

/**
 * The instruments the runner can actually run today. The catalogue's `ready`
 * must match this (src/ui/__tests__/catalog.test.ts), so adding an entry here
 * is what makes a test appear as ready — and nothing else can.
 */
export interface RunnableInstrument {
  readonly config: RunnerConfig;
  /** The brief, as figures: read in one glance before the clock starts. */
  readonly facts: readonly { readonly value: string; readonly label: string }[];
  /** One line under the figures. */
  readonly instruction: string;
}

export const RUNNABLE: Partial<Readonly<Record<RunnerInstrument, RunnableInstrument>>> = {
  wat: {
    config: INSTRUMENT_CONFIGS.wat,
    facts: [
      { value: '60', label: 'Words' },
      { value: '15s', label: 'Each' },
      { value: '0', label: 'Going back' },
    ],
    instruction: 'Write the first sentence each word brings to mind.',
  },
};
