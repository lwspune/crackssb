import watItems from '../../../content/wat-items.json';
import type { RunnerContent } from './Runner.tsx';

/**
 * Stimulus for the runner, read from the seeded item bank.
 *
 * Known gap, accepted until Sprint 1: importing the bank ships all sixty
 * words to the browser at once, where UI.md §3.2 rule 4 wants each released
 * only when it is due. The engine already emits `release` per item; the
 * Supabase-backed source will answer it from the server instead of this file.
 */

const WAT_WORDS: readonly string[] = [...watItems.items].sort((a, b) => a.ordinal - b.ordinal).map((i) => i.payload.word);

export const WAT_CONTENT: RunnerContent = {
  stimulus: (item) => WAT_WORDS[item] ?? '',
};
