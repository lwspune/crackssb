'use server';

import { getViewer } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { parsePracticeAnswer, practiceRefusal } from '@/oir/practice.ts';
import type { OptionLabel } from '@/items/bank.ts';
import type { PracticeResult } from '@/ui/practice/PracticeRunner.tsx';

/** Every code answer_practice raises (0007). Anything else is 'network'. */
const CODES = /\b(not_a_candidate|dob_required|consent_required|bad_choice|unknown_item)\b/;

/**
 * Answer one practice question (D26). Checked here, then by the database,
 * which keeps the answer and returns the key and its rule.
 */
export async function answerPractice(itemId: string, chosen: string): Promise<PracticeResult> {
  const parsed = parsePracticeAnswer(itemId, chosen);
  if (!parsed) return { ok: false, message: 'Choose A, B, C or D.' };
  if (!(await getViewer())) return { ok: false, message: 'Your session has ended. Sign in again.' };

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.rpc('answer_practice', { p_item_id: parsed.itemId, p_chosen: parsed.chosen });
  const row = (data as { correct: boolean; key: OptionLabel; rule: string | null }[] | null)?.[0];
  if (error || !row) {
    const code = CODES.exec(error?.message ?? '')?.[1] ?? 'network';
    console.error('answer_practice failed', { code });
    return { ok: false, message: practiceRefusal(code) };
  }
  return { ok: true, correct: row.correct, key: row.key, rule: row.rule };
}
