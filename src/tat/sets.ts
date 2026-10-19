import { z } from 'zod';
import file from '../../content/tat/sets.json' with { type: 'json' };
import { INSTRUMENT_CONFIGS } from '../runner/modes.ts';
import { PICTURES, pictureById } from './pictures.ts';

/**
 * TAT sets (D36): eleven pictures in a fixed order, and the blank twelfth
 * slide every set ends on. Seeded as `tests` + `test_items` (npm run tat:seed),
 * so a set someone has sat cannot change (0009, 0017). Validated on load.
 */

export const BLANK_ID = 'tat-blank';

const set = z.object({
  id: z.string().regex(/^tat-set-\d{2}$/),
  title: z.string().min(1).max(40),
  pictures: z.array(z.string().regex(/^tat-\d{2}$/)).length(11),
});

export type TatSet = z.infer<typeof set>;

export const SETS: readonly TatSet[] = z.object({ sets: z.array(set) }).parse(file).sets;

export function setById(id: string): TatSet | undefined {
  return SETS.find((s) => s.id === id);
}

const config = INSTRUMENT_CONFIGS.tat;
if (config.mode !== 'stimulus_write') throw new Error('TAT runs in Stimulus → write');

const SLIDES = config.itemCount;
/** A whole set on the clock: every slide's look and write, back to back. */
export const SET_SECONDS = SLIDES * config.phases.reduce((t, p) => t + p.seconds, 0);

/** What the runner shows, slide by slide: the picture, or nothing on the blank. */
export interface Slide {
  readonly id: string;
  readonly image: string | null;
  readonly title: string;
}

const BLANK: Slide = { id: BLANK_ID, image: null, title: 'Blank' };

export function slidesOf(s: TatSet): Slide[] {
  return [
    ...s.pictures.map((id) => {
      const p = pictureById(id);
      if (!p) throw new Error(`${s.id}: no picture ${id}`);
      return { id, image: `/tat/${id}.jpg`, title: p.title };
    }),
    BLANK,
  ];
}

const DIFFICULTY = { clear: 2, hazy: 3 } as const;

/** The `items` rows (npm run tat:seed): the slide to show, never the ground truth. The blank is one too. */
export function itemRows() {
  return [
    ...PICTURES.map((p) => ({
      id: p.id,
      assessment_type: 'tat' as const,
      difficulty: DIFFICULTY[p.difficulty],
      payload: { title: p.title, image: `/tat/${p.id}.jpg` as string | null },
      active: true,
      source: p.source.kind,
      source_ref: p.source.url,
    })),
    {
      id: BLANK_ID,
      assessment_type: 'tat' as const,
      difficulty: 3,
      payload: { title: BLANK.title, image: null },
      active: true,
      source: 'owner' as const,
      source_ref: 'The blank twelfth slide of every TAT set.',
    },
  ];
}

/** The `tests` and `test_items` rows: each set, its pictures in order, the blank last. */
export function testRows() {
  return {
    tests: SETS.map((s) => ({ id: s.id, assessment_type: 'tat' as const, title: s.title, item_count: SLIDES, time_limit_seconds: SET_SECONDS })),
    items: SETS.flatMap((s) => [...s.pictures, BLANK_ID].map((item_id, ordinal) => ({ test_id: s.id, ordinal, item_id }))),
  };
}
