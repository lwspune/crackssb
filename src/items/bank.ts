import { z } from 'zod';

/**
 * The item bank — the `items` row of ARCHITECTURE.md §4, validated, and
 * booklet assembly from it.
 *
 * One shape for every instrument: the instrument-specific part lives in
 * `payload`. `content/wat-items.json` already has this shape; nothing here
 * invents a second one.
 */

export const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;
export type OptionLabel = (typeof OPTION_LABELS)[number];

export type ItemAssessmentType = 'oir_verbal' | 'oir_nonverbal' | 'ppdt' | 'tat' | 'wat' | 'srt' | 'sdt';

export interface OirPayload {
  readonly stem: string;
  readonly options: Readonly<Record<OptionLabel, string>>;
  /** Never released to the client. `assembleBooklet` strips it. */
  readonly key: OptionLabel;
  /** analogy, series, classification, coding, ... — what the scorer groups by. */
  readonly reasoningType: string;
  /** Figure for non-verbal items. */
  readonly assetPath?: string;
  /** The printed instruction a stem sits under ("find the wrong number"). A bare series cannot be answered without it. */
  readonly direction?: string;
}

export interface WatPayload {
  readonly word: string;
  readonly valence?: string;
}

export interface SrtPayload {
  readonly situation: string;
}

export interface Item<P = unknown> {
  readonly id: string;
  readonly assessment_type: ItemAssessmentType;
  readonly payload: P;
  /** 1 (easiest) – 5. */
  readonly difficulty: number;
  readonly active: boolean;
  /** Where it came from — a deck name, an author, a licence. */
  readonly source: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const optionLabel = z.enum(OPTION_LABELS);

const oirPayload = z.object({
  stem: z.string().min(1),
  options: z.object({ A: z.string().min(1), B: z.string().min(1), C: z.string().min(1), D: z.string().min(1) }),
  key: optionLabel,
  reasoningType: z.string().min(1),
  assetPath: z.string().min(1).optional(),
  direction: z.string().min(1).optional(),
});

const watPayload = z.object({ word: z.string().min(1), valence: z.string().optional() });
const srtPayload = z.object({ situation: z.string().min(1) });

/** Instruments without a fixed payload yet accept any object. Tighten as each ships. */
const openPayload = z.record(z.string(), z.unknown());

const PAYLOAD_SCHEMAS: Readonly<Record<ItemAssessmentType, z.ZodType>> = {
  oir_verbal: oirPayload,
  oir_nonverbal: oirPayload,
  wat: watPayload,
  srt: srtPayload,
  ppdt: openPayload,
  tat: openPayload,
  sdt: openPayload,
};

const ASSESSMENT_TYPES = Object.keys(PAYLOAD_SCHEMAS) as [ItemAssessmentType, ...ItemAssessmentType[]];

const itemShell = z.object({
  id: z.string().min(1),
  assessment_type: z.enum(ASSESSMENT_TYPES),
  payload: z.unknown(),
  difficulty: z.number().int().min(1).max(5),
  active: z.boolean(),
  source: z.string().min(1),
});

/** One message naming the field, so the caller can see what was wrong without reading a zod issue list. */
function fail(prefix: string, err: z.ZodError): never {
  const issue = err.issues[0];
  const path = [prefix, ...issue.path.map(String)].filter(Boolean).join('.');
  throw new TypeError(`${path}: ${issue.message}`);
}

export function validatePayload(type: ItemAssessmentType, payload: unknown): unknown {
  const r = PAYLOAD_SCHEMAS[type].safeParse(payload);
  if (!r.success) fail('payload', r.error);
  return r.data;
}

export function validateItem(raw: unknown): Item {
  const shell = itemShell.safeParse(raw);
  if (!shell.success) fail('', shell.error);
  const payload = validatePayload(shell.data.assessment_type, shell.data.payload);
  return { ...shell.data, payload };
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export interface ReleasedItem {
  readonly id: string;
  readonly ordinal: number;
  /** The payload minus anything the client must not see. */
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface AssembledBooklet {
  readonly type: ItemAssessmentType;
  readonly released: readonly ReleasedItem[];
  /** ordinal → key. Stays server-side. Empty for un-keyed instruments. */
  readonly answerKey: Readonly<Record<number, OptionLabel>>;
}

/** Small, seedable, good enough for shuffling. Not for anything cryptographic. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: readonly T[], rand: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `count` active items of one type, balanced across reasoning types
 * where the instrument has them, in an order fixed by `seed`. The key is
 * separated from what is released — the client gets a booklet, the server
 * keeps the answers (UI.md §3.1, Booklet: "serve the whole item list WITHOUT
 * answer keys").
 */
export function assembleBooklet(
  bank: readonly Item[],
  opts: { type: ItemAssessmentType; count: number; seed: number },
): AssembledBooklet {
  if (!Number.isInteger(opts.count) || opts.count < 1) throw new RangeError(`count must be a positive integer, got ${opts.count}`);

  const pool = bank.filter((i) => i.active && i.assessment_type === opts.type);
  if (pool.length < opts.count) {
    throw new RangeError(`Only ${pool.length} active ${opts.type} items in the bank, need ${opts.count}`);
  }

  const rand = mulberry32(opts.seed);

  // Group by reasoning type when present, shuffle within each group, then
  // draw round-robin so no type dominates a booklet.
  const groups = new Map<string, Item[]>();
  for (const item of pool) {
    const t = typeof (item.payload as { reasoningType?: unknown })?.reasoningType === 'string'
      ? (item.payload as { reasoningType: string }).reasoningType
      : '';
    groups.set(t, [...(groups.get(t) ?? []), item]);
  }
  const queues = [...groups.keys()].sort().map((k) => shuffle(groups.get(k)!, rand));

  const picked: Item[] = [];
  while (picked.length < opts.count) {
    for (const q of queues) {
      if (picked.length === opts.count) break;
      const next = q.shift();
      if (next) picked.push(next);
    }
  }

  const ordered = shuffle(picked, rand);
  const answerKey: Record<number, OptionLabel> = {};
  const released = ordered.map((item, ordinal) => {
    const { key, ...rest } = item.payload as Record<string, unknown> & { key?: OptionLabel };
    if (key !== undefined) answerKey[ordinal] = key;
    return { id: item.id, ordinal, payload: rest };
  });

  return { type: opts.type, released, answerKey };
}
