import { z } from 'zod';
import file from '../../content/ppdt/samples.json' with { type: 'json' };

/**
 * One strong reading per PPDT picture (D33), shown after the candidate's own
 * attempt — "one way among many", never the answer. Validated on load.
 */
const SAMPLES = z.object({ samples: z.record(z.string().regex(/^ppdt-\d{2}$/), z.string().min(1)) }).parse(file).samples;

export function sampleFor(pictureId: string): string | null {
  return Object.hasOwn(SAMPLES, pictureId) ? SAMPLES[pictureId] : null;
}
