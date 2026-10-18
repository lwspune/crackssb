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
  /** Where it begins, when not at /run/<instrument> — OIR mocks are chosen first (D32). */
  readonly start?: string;
}

export const RUNNABLE: Partial<Readonly<Record<RunnerInstrument, RunnableInstrument>>> = {
  oir: {
    config: INSTRUMENT_CONFIGS.oir,
    facts: [
      { value: '40', label: 'Questions' },
      { value: '20 min', label: 'In all' },
      { value: 'Any', label: 'Order' },
    ],
    instruction: 'Answer in any order. Change an answer until you submit.',
    start: '/practise/oir',
  },
  ppdt: {
    config: INSTRUMENT_CONFIGS.ppdt,
    facts: [
      { value: '30 s', label: 'Look' },
      { value: '1 min', label: 'Note' },
      { value: '4 min', label: 'Write' },
    ],
    instruction: 'Look at the picture, note who is in it, then write a story about it.',
    start: '/practise/ppdt',
  },
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
