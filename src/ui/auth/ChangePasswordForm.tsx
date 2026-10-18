'use client';

import { useActionState } from 'react';
import { INPUT, PasswordField } from '../staff/PasswordField.tsx';

/** Anyone changes their own password, with the current one (D31). */

export type ChangePasswordState = { readonly kind: 'idle' } | { readonly kind: 'error'; readonly message: string } | { readonly kind: 'done' };

interface Props {
  action: (state: ChangePasswordState, form: FormData) => Promise<ChangePasswordState>;
  who: { readonly email: string; readonly fullName: string };
}

export function ChangePasswordForm({ action, who }: Props) {
  const [state, submit, pending] = useActionState(action, { kind: 'idle' });
  return (
    <form action={submit} className="space-y-4">
      <div>
        <label htmlFor="current-password" className="block text-sm font-semibold">Current password</label>
        <input id="current-password" name="current" type="password" autoComplete="current-password" className={`mt-1.5 ${INPUT}`} />
      </div>
      <PasswordField id="next-password" name="next" label="New password" who={who} generate={false} />
      {state.kind === 'error' && <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">{state.message}</p>}
      {state.kind === 'done' && <p role="status" className="text-sm font-medium text-brand-accent">Password changed.</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {pending ? 'Changing…' : 'Change password'}
      </button>
    </form>
  );
}
