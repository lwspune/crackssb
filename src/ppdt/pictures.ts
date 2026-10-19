import { z } from 'zod';
import manifest from '../../content/ppdt/pictures.json' with { type: 'json' };

/**
 * The PPDT pictures (D33, D35): twenty-one slides, all supplied or chosen by
 * the owner, each with the ground truth the feedback checks against.
 * Validated on load, so a hand-edited manifest that does not hang together
 * fails here, not on a candidate's screen.
 */

export type Mood = 'positive' | 'neutral' | 'negative';
const mood = z.enum(['positive', 'neutral', 'negative']);

const picture = z.object({
  id: z.string().regex(/^ppdt-\d{2}$/),
  title: z.string().min(1),
  difficulty: z.enum(['clear', 'hazy', 'ambiguous']),
  /** How many people a careful look counts; anything in [min, max] is accepted. */
  people: z.object({ min: z.number().int().min(1), typical: z.number().int(), max: z.number().int() }),
  /** The people worth describing one by one, as the sheet's character box asks. Empty for a crowd. */
  characters: z.array(z.object({ sex: z.enum(['M', 'F', '?']), age: z.string().regex(/^\d{1,2}-\d{1,2}$/), mood })),
  /** The overall moods a fair reading can give. */
  moods: z.array(mood).min(1),
  action: z.string().min(10),
  source: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('pexels'), url: z.string().url(), photographer: z.string().min(1), licence: z.literal('Pexels License') }),
    z.object({ kind: z.literal('owner'), note: z.string().min(1) }),
  ]),
  processing: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('photo'), blur: z.number(), contrast: z.number(), mask: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional() }),
    z.object({ kind: z.literal('sketch'), crop: z.tuple([z.number(), z.number(), z.number(), z.number()]), blur: z.number() }),
  ]),
});

export type PpdtPicture = z.infer<typeof picture>;

export const PICTURES: readonly PpdtPicture[] = z.object({ pictures: z.array(picture) }).parse(manifest).pictures;

export function pictureById(id: string): PpdtPicture | undefined {
  return PICTURES.find((p) => p.id === id);
}

const DIFFICULTY = { clear: 2, hazy: 3, ambiguous: 4 } as const;

/** The `items` rows the pictures are seeded as (npm run ppdt:seed): what a session points at and the screen shows. */
export function pictureRows() {
  return PICTURES.map((p) => ({
    id: p.id,
    assessment_type: 'ppdt' as const,
    difficulty: DIFFICULTY[p.difficulty],
    payload: { title: p.title, image: `/ppdt/${p.id}.jpg`, difficulty: p.difficulty },
    active: true,
    source: p.source.kind,
    source_ref: p.source.kind === 'pexels' ? p.source.url : p.source.note,
  }));
}
