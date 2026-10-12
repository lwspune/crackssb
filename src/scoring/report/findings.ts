import { z } from 'zod';
import { INSTRUMENT_SPECS } from '../thresholds.ts';

/**
 * The report reader's input contract — what Layer 5 consumes.
 *
 * Today `content/report-findings.json` is hand-derived. When Layer 3 runs
 * for real its output must land in this same shape, and the renderer does
 * not change (D15). Validation happens HERE, at the boundary, whatever
 * produced the findings: a hand-edit, a model, a script.
 *
 * D16 lives here too. The regex used to sit in `scripts/build-reports.mjs`
 * and ran over rendered output; that caught most violations and missed
 * "more than most manage". It now runs over every string in the findings on
 * parse — earlier, and independent of any renderer. It is still a regex: it
 * catches what it was told to catch. Read the output.
 */

const SLIDES = INSTRUMENT_SPECS.tat.items;

/** `[attempted, target]`, or null when the instrument was not in the submission. */
const count = z
  .tuple([z.number().int().min(0), z.number().int().min(1)])
  .nullable()
  .refine((c) => c === null || c[0] <= c[1], { message: 'counts: attempted exceeds target' });

const story = z.number().int().min(1).max(SLIDES);

export const FindingsSchema = z
  .strictObject({
    name: z.string().min(1),
    counts: z.strictObject({ tat: count, srt: count, wat: count, sdt: count }),
    headline: z.string().min(1),
    oneLine: z.string().min(1),
    strengths: z.array(z.strictObject({ story, quote: z.string().min(1), why: z.string().min(1) })),
    themeIssues: z.array(z.strictObject({ story, what: z.string().min(1), why: z.string().min(1) })),
    incomplete: z.array(story),
    blank: z.array(story),
    perception: z.strictObject({ story, wrote: z.string().min(1), shows: z.string().min(1) }).nullable(),
    craft: z.array(z.string().min(1)),
    watNote: z.string().nullable(),
    srtNote: z.string().nullable(),
    priorities: z.array(z.string().min(1)).min(1),
    closing: z.string().min(1),
  })
  .superRefine((f, ctx) => {
    const both = f.incomplete.filter((s) => f.blank.includes(s));
    if (both.length > 0) {
      ctx.addIssue({ code: 'custom', message: `stories both blank and incomplete: ${both.join(', ')}` });
    }
  });

export type Findings = z.infer<typeof FindingsSchema>;

// ---------------------------------------------------------------------------
// D16
// ---------------------------------------------------------------------------

/**
 * What a candidate's report may not contain: the human assessor's marking,
 * which does not exist in production, and any comparison with another
 * candidate, whose work they cannot see. Moved verbatim from
 * `scripts/build-reports.mjs`, including the phrase that got past the first
 * version.
 */
export const FORBIDDEN = new RegExp(
  [
    // the human assessor's marking
    String.raw`\bassessor\b`,
    String.raw`\bverdict\b`,
    String.raw`\bmarginalia\b`,
    String.raw`\bmarked (?:down )?by\b`,
    String.raw`\bred pen\b`,
    // any comparison with another candidate
    String.raw`\bother candidates?\b`,
    String.raw`\byour batch\b`,
    String.raw`\bpeers\b`,
    String.raw`\bof (?:ten|10|eleven|11) candidates\b`,
    String.raw`\bthan (?:most|others|other candidates|average candidate)\b`,
    String.raw`\b(?:above|below|more than|fewer than|better than|worse than) (?:most|average|the rest)\b`,
    String.raw`\bmost (?:candidates|manage|others)\b`,
    String.raw`\bin the (?:batch|cohort|group)\b`,
    String.raw`\branked?\b`,
    String.raw`\bcompared with other\b`,
  ].join('|'),
  'i',
);

export function assertGrounded(text: string, where = 'text'): void {
  const hit = text.match(FORBIDDEN);
  if (hit) throw new Error(`D16 violation at ${where}: "${hit[0]}"`);
}

/** Every string anywhere in the value, with its path, so a violation names where it was. */
function walkStrings(value: unknown, path: string, visit: (s: string, at: string) => void): void {
  if (typeof value === 'string') visit(value, path);
  else if (Array.isArray(value)) value.forEach((v, i) => walkStrings(v, `${path}[${i}]`, visit));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkStrings(v, path ? `${path}.${k}` : k, visit);
  }
}

export function parseFindings(raw: unknown): Findings {
  const r = FindingsSchema.safeParse(raw);
  if (!r.success) {
    const issue = r.error.issues[0];
    const path = issue.path.map(String).join('.');
    throw new TypeError(`${path ? path + ': ' : ''}${issue.message}`);
  }
  walkStrings(r.data, '', assertGrounded);
  return r.data;
}
