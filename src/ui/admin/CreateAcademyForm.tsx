'use client';

import { useActionState, useState } from 'react';
import { slugify } from './slug.ts';

export interface CreateAcademyState {
  readonly error: string | null;
}

export function CreateAcademyForm({ action }: { action: (s: CreateAcademyState, f: FormData) => Promise<CreateAcademyState> }) {
  const [state, submit, pending] = useActionState(action, { error: null });
  const [name, setName] = useState('');
  const slug = slugify(name);

  return (
    <form action={submit} className="rounded-xl border bg-card p-5 shadow-card">
      <label htmlFor="academy-name" className="block text-sm font-semibold">New academy</label>
      <div className="mt-2 flex flex-wrap gap-3">
        <input
          id="academy-name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          aria-describedby="academy-slug"
          placeholder="LWS Pune"
          className="min-h-12 min-w-0 flex-1 basis-56 rounded-lg border bg-background px-3.5 text-base"
        />
        <button type="submit" disabled={pending || !slug} className="inline-flex min-h-12 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50">
          {pending ? 'Creating…' : 'Create'}
        </button>
      </div>
      <p id="academy-slug" className="mt-2 text-xs text-muted-foreground">Short name: {slug || '—'}</p>
      {state.error && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{state.error}</p>}
    </form>
  );
}
