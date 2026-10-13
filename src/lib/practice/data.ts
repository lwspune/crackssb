import type { SupabaseClient } from '@supabase/supabase-js';
import type { OirPayload } from '../../items/bank.ts';
import type { PracticeAnswer } from '../../oir/practice.ts';
import type { PracticeItem } from '../../ui/practice/PracticeRunner.tsx';

/**
 * Reads for chapter practice (D26), as the signed-in user: items are readable
 * by anyone signed in (0005), answers under row level security (0007). Keys
 * are never read here — only answer_practice returns one.
 *
 * Server-only: called from Server Components with the user's client.
 */

const OIR_TYPES = ['oir_verbal', 'oir_nonverbal'];
/** PostgREST returns at most this many rows per request. */
const PAGE = 1000;

async function allPages<T>(what: string, page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) {
      console.error(`loading ${what} failed`, { code: error.code });
      throw new Error(`Could not load ${what}`);
    }
    out.push(...(data ?? []));
    if (!data || data.length < PAGE) return out;
  }
}

/** Every active OIR item's id and chapter, in book order. */
export function loadOirIndex(client: SupabaseClient): Promise<{ id: string; reasoningType: string }[]> {
  return allPages('the OIR items', (from, to) =>
    client.from('items').select('id, reasoningType:payload->>reasoningType').in('assessment_type', OIR_TYPES).order('id').range(from, to),
  );
}

/** One chapter's questions, keyless, in book order. */
export async function loadChapterItems(client: SupabaseClient, reasoningType: string): Promise<PracticeItem[]> {
  const rows = await allPages<{ id: string; payload: Omit<OirPayload, 'key'> }>('the chapter', (from, to) =>
    client.from('items').select('id, payload').in('assessment_type', OIR_TYPES).eq('payload->>reasoningType', reasoningType).order('id').range(from, to),
  );
  return rows.map(({ id, payload }) => ({
    id,
    stem: payload.stem,
    options: payload.options,
    ...(payload.direction ? { direction: payload.direction } : {}),
    ...(payload.passage ? { passage: payload.passage } : {}),
    ...(payload.tables ? { tables: payload.tables } : {}),
    ...(payload.figure ? { figure: payload.figure } : {}),
    ...(payload.dice ? { dice: payload.dice } : {}),
    ...(payload.answerPanels ? { answerPanels: payload.answerPanels } : {}),
  }));
}

/**
 * The viewer's own practice answers. Filtered to the viewer explicitly: row
 * level security would also hand staff their academy's answers.
 */
export function loadOwnAnswers(client: SupabaseClient, viewerId: string): Promise<PracticeAnswer[]> {
  return allPages('your answers', (from, to) =>
    client.from('practice_answers').select('item_id, correct, answered_at').eq('candidate_id', viewerId).order('answered_at').range(from, to),
  );
}
