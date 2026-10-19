import { z } from 'zod';
import manifest from '../../content/tat/pictures.json' with { type: 'json' };

/**
 * The TAT pictures (D36): line drawings the owner chose from two practice
 * sites, each with what a careful look shows. That is the ground truth the
 * result page shows beside the story, and what the judge reads (rubric.ts).
 * Validated on load, so a hand-edited manifest that does not hang together
 * fails here, not on a candidate's screen.
 */

const picture = z.object({
  id: z.string().regex(/^tat-\d{2}$/),
  title: z.string().min(1).max(40),
  difficulty: z.enum(['clear', 'hazy']),
  /** What a careful look finds: who, where, what is happening. Never what it means. */
  shows: z.string().min(60),
  /** How many people a careful look counts. */
  people: z.object({ min: z.number().int().min(1), typical: z.number().int(), max: z.number().int() }),
  source: z.object({ kind: z.literal('owner'), url: z.string().url(), note: z.string().min(1) }),
  processing: z.object({ crop: z.tuple([z.number(), z.number(), z.number(), z.number()]), blur: z.number() }),
});

export type TatPicture = z.infer<typeof picture>;

export const PICTURES: readonly TatPicture[] = z.object({ pictures: z.array(picture) }).parse(manifest).pictures;

export function pictureById(id: string): TatPicture | undefined {
  return PICTURES.find((p) => p.id === id);
}
