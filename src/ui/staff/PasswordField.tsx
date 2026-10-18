'use client';

import { useState } from 'react';
import { generatePassword, passwordProblem } from '../../lib/auth/password.ts';

/**
 * A password typed by staff (D31), or generated on request. Hidden while
 * typed, shown once generated so it can be read out. The rules are checked
 * as it is typed and again on the server.
 */

export const INPUT =
  'block min-h-12 w-full rounded-lg border bg-card px-3.5 text-base shadow-card focus:border-brand-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-ring';

interface Props {
  id: string;
  name: string;
  label: string;
  /** The person it is for, so their own name or email is refused. */
  who: { readonly email: string; readonly fullName: string };
  autoComplete?: string;
  /** Offer "Generate" — for a password handed to someone else, not one a person picks for themselves. */
  generate?: boolean;
  /** Told every change, for a form that needs the value. */
  onValue?: (value: string) => void;
}

export function PasswordField({ id, name, label, who, autoComplete = 'new-password', generate = true, onValue }: Props) {
  const [value, setRaw] = useState('');
  const setValue = (v: string) => {
    setRaw(v);
    onValue?.(v);
  };
  const [shown, setShown] = useState(false);
  const problem = value === '' ? null : passwordProblem(value, who);

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">{label}</label>
      <div className="mt-1.5 flex gap-2">
        <input
          id={id}
          name={name}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoComplete={autoComplete}
          spellCheck={false}
          autoCapitalize="none"
          aria-invalid={problem ? true : undefined}
          aria-describedby={problem ? `${id}-problem` : undefined}
          className={`${INPUT} min-w-0 flex-1 font-mono`}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          className="inline-flex min-h-12 shrink-0 items-center rounded-lg border px-3 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
        {generate && (
          <button
            type="button"
            onClick={() => {
              setValue(generatePassword());
              setShown(true);
            }}
            className="inline-flex min-h-12 shrink-0 items-center rounded-lg border px-3 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
          >
            Generate
          </button>
        )}
      </div>
      {problem && <p id={`${id}-problem`} className="mt-1.5 text-sm text-destructive">{problem}</p>}
    </div>
  );
}
