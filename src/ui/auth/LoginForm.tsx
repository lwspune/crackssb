'use client';

import { useActionState } from 'react';

export interface LoginState {
  readonly error: string | null;
}

interface Props {
  /** The server action. Returns only on failure; success redirects. */
  action: (state: LoginState, form: FormData) => Promise<LoginState>;
  next: string | null;
}

export function LoginForm({ action, next }: Props) {
  const [state, submit, pending] = useActionState(action, { error: null });

  return (
    <form action={submit} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          className="mt-1.5 block min-h-12 w-full rounded-lg border bg-card px-3.5 text-base shadow-card focus:border-brand-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-semibold">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5 block min-h-12 w-full rounded-lg border bg-card px-3.5 text-base shadow-card focus:border-brand-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-ring"
        />
      </div>
      {state.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-12 w-full items-center justify-center rounded-lg bg-brand text-base font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-60"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
