'use server';

import { createClient } from '@supabase/supabase-js';
import { changeOwnPassword } from '@/lib/auth/own-password.ts';
import { getViewer } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import type { ChangePasswordState } from '@/ui/auth/ChangePasswordForm.tsx';

/** The signed-in user changes their own password (D31). The current one is checked on a throwaway client. */
export async function changeMyPassword(_state: ChangePasswordState, form: FormData): Promise<ChangePasswordState> {
  if (!(await getViewer())) return { kind: 'error', message: 'Your session has ended. Sign in again.' };
  const current = String(form.get('current') ?? '');
  const next = String(form.get('next') ?? '');
  if (current === '') return { kind: 'error', message: 'Enter your current password.' };

  const verifier = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await changeOwnPassword(await createSupabaseServer(), verifier, { current, next });
  if (result.kind === 'wrong_current') return { kind: 'error', message: 'Your current password is wrong.' };
  if (result.kind === 'invalid') return { kind: 'error', message: result.error };
  return { kind: 'done' };
}
