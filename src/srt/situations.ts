import { z } from 'zod';
import bank from '../../content/srt/situations.json' with { type: 'json' };
import file from '../../content/srt/sets.json' with { type: 'json' };
import { INSTRUMENT_CONFIGS } from '../runner/modes.ts';

/**
 * SRT (D39): situations the owner chose from a practice site, shown in the
 * third person as the SSB booklet reads (`text`), the site's own wording kept
 * beside each; and the sets they run in, sixty in thirty minutes. Seeded as
 * `items` and `tests` (npm run srt:seed), so a set someone has sat cannot
 * change (0009). Never the site's model responses. Validated on load.
 */

const situation = z.object({
  id: z.string().regex(/^srt-\d{3}$/),
  text: z.string().min(10),
  source: z.object({ url: z.string().url(), part: z.number().int(), n: z.number().int(), wording: z.string().min(1) }),
});
const held = z.object({ url: z.string().url(), part: z.number().int(), n: z.number().int(), wording: z.string(), reason: z.string().min(1) });
const set = z.object({ id: z.string().regex(/^srt-set-\d{2}$/), title: z.string().min(1).max(40), situations: z.array(z.string().regex(/^srt-\d{3}$/)) });

export type SrtSituation = z.infer<typeof situation>;
export type SrtSet = z.infer<typeof set>;

const parsed = z.object({ situations: z.array(situation), held: z.array(held) }).parse(bank);
export const SITUATIONS: readonly SrtSituation[] = parsed.situations;
export const HELD = parsed.held;
export const SETS: readonly SrtSet[] = z.object({ sets: z.array(set) }).parse(file).sets;

const config = INSTRUMENT_CONFIGS.srt;
if (config.mode !== 'booklet') throw new Error('SRT runs as a booklet');
const LENGTH = config.itemCount;
/** A whole set on the clock. */
export const SET_SECONDS = config.timeLimitSeconds;

export function setById(id: string): SrtSet | undefined {
  return SETS.find((s) => s.id === id);
}

export function situationById(id: string): SrtSituation | undefined {
  return SITUATIONS.find((s) => s.id === id);
}

/** The `items` rows: what the candidate reads, never the source's wording or anything else. */
export function itemRows() {
  return SITUATIONS.map((s) => ({
    id: s.id,
    assessment_type: 'srt' as const,
    difficulty: 3,
    payload: { text: s.text },
    active: true,
    source: 'owner' as const,
    source_ref: s.source.url,
  }));
}

/** The `tests` and `test_items` rows: each set, its situations in order. */
export function testRows() {
  return {
    tests: SETS.map((s) => ({ id: s.id, assessment_type: 'srt' as const, title: s.title, item_count: LENGTH, time_limit_seconds: SET_SECONDS })),
    items: SETS.flatMap((s) => s.situations.map((item_id, ordinal) => ({ test_id: s.id, ordinal, item_id }))),
  };
}
