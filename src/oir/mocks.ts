/**
 * OIR mocks (D32): fixed, numbered booklets of 30 verbal + 10 non-verbal
 * questions in 20 minutes. Practice, not a ranking — every question stays in
 * chapter practice too, retakes are unlimited and there is no percentile.
 *
 * Fixed so that "Mock 3" means the same questions to everyone, today and
 * next month: a mock, once written to content/oir-mocks.json, never changes,
 * and new mocks are only appended (the database refuses to change a mock
 * anyone has sat, 0009). Pure; `npm run oirmocks` writes the file.
 */

export const MOCK_SHAPE = { oir_verbal: 30, oir_nonverbal: 10 } as const;
export const MOCK_SECONDS = 20 * 60;

type MockType = keyof typeof MOCK_SHAPE;

/** The parts of a content/oir-items.json entry this reads. */
export interface BankItem {
  readonly id: string;
  readonly assessment_type: string;
  readonly active: boolean;
  /** 'medium' keys wait for the book's answer key (D24) and stay out of anything scored. */
  readonly confidence?: string;
  readonly payload: { readonly reasoningType: string; readonly passage?: string };
}

export interface Mock {
  readonly id: string;
  readonly title: string;
  readonly timeLimitSeconds: number;
  /** In booklet order. */
  readonly itemIds: readonly string[];
}

/** Active, a trusted key, and stands alone (a question sharing a passage needs its group, which a mixed booklet would split). */
export function isMockable(item: BankItem): boolean {
  return item.active && item.confidence !== 'medium' && item.payload.passage === undefined && item.assessment_type in MOCK_SHAPE;
}

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

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The mocks given, unchanged, followed by new ones up to `target`. Each new
 * mock draws only questions no mock uses yet, spread across question types:
 * every slot goes to the type this mock has fewest of so far, then to the type
 * with the most questions left — so small types are not used up early and
 * each mock covers as many types as the bank allows. Deterministic in
 * (bank, existing, seed).
 */
export function extendMocks(bank: readonly BankItem[], existing: readonly Mock[], target: number, seed: number): Mock[] {
  const used = new Set(existing.flatMap((m) => m.itemIds));
  const out = [...existing];

  for (let n = existing.length + 1; n <= target; n++) {
    const rand = mulberry32(seed * 1000 + n);
    const picked: string[] = [];

    for (const type of Object.keys(MOCK_SHAPE) as MockType[]) {
      const groups = new Map<string, string[]>();
      for (const item of [...bank].sort((a, b) => a.id.localeCompare(b.id))) {
        if (item.assessment_type !== type || !isMockable(item) || used.has(item.id)) continue;
        groups.set(item.payload.reasoningType, [...(groups.get(item.payload.reasoningType) ?? []), item.id]);
      }
      const queues = new Map([...groups].sort(([a], [b]) => a.localeCompare(b)).map(([k, ids]) => [k, shuffle(ids, rand)]));
      const inThisMock = new Map<string, number>();

      for (let slot = 0; slot < MOCK_SHAPE[type]; slot++) {
        const choice = [...queues.entries()]
          .filter(([, q]) => q.length > 0)
          .sort(([a, qa], [b, qb]) => (inThisMock.get(a) ?? 0) - (inThisMock.get(b) ?? 0) || qb.length - qa.length || a.localeCompare(b))[0];
        if (!choice) throw new RangeError(`Not enough ${type} questions left for mock ${n}: the bank has run out.`);
        const [rt, q] = choice;
        const id = q.shift()!;
        picked.push(id);
        used.add(id);
        inThisMock.set(rt, (inThisMock.get(rt) ?? 0) + 1);
      }
    }

    out.push({ id: `oir-mock-${pad(n)}`, title: `OIR Mock ${n}`, timeLimitSeconds: MOCK_SECONDS, itemIds: shuffle(picked, rand) });
  }
  return out;
}

/** Every problem with a set of mocks, as lines to print; empty when they are sound. */
export function checkMocks(bank: readonly BankItem[], mocks: readonly Mock[]): string[] {
  const byId = new Map(bank.map((b) => [b.id, b]));
  const seen = new Set<string>();
  const problems: string[] = [];

  mocks.forEach((m, i) => {
    const expectedId = `oir-mock-${pad(i + 1)}`;
    if (m.id !== expectedId) problems.push(`${m.id}: should be ${expectedId}`);
    if (m.timeLimitSeconds !== MOCK_SECONDS) problems.push(`${m.id}: ${m.timeLimitSeconds} s, not ${MOCK_SECONDS}`);
    const count: Record<string, number> = { oir_verbal: 0, oir_nonverbal: 0 };
    for (const id of m.itemIds) {
      const item = byId.get(id);
      if (!item || !isMockable(item)) problems.push(`${m.id}: ${id} is not a usable question`);
      else count[item.assessment_type]++;
      if (seen.has(id)) problems.push(`${m.id}: ${id} is also in an earlier mock`);
      seen.add(id);
    }
    if (count.oir_verbal !== MOCK_SHAPE.oir_verbal || count.oir_nonverbal !== MOCK_SHAPE.oir_nonverbal) {
      problems.push(`${m.id}: ${count.oir_verbal} verbal + ${count.oir_nonverbal} non-verbal, not ${MOCK_SHAPE.oir_verbal} + ${MOCK_SHAPE.oir_nonverbal}`);
    }
  });
  return problems;
}
