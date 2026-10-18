'use client';

import { useState } from 'react';
import { loginMessage, whatsappHref } from './login-message.ts';
import type { LoginToSend } from './login-message.ts';

/**
 * A login, ready to send (D31): the WhatsApp message as it will read, a copy
 * button, and WhatsApp opened with it filled in — at the person's own chat
 * when their number is on file. The password exists only here, once.
 */
export function LoginHandout({ login, phone }: { login: LoginToSend; phone: string | null }) {
  const [copied, setCopied] = useState(false);
  const text = loginMessage(login);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <p className="text-sm font-medium text-destructive">Shown once. Send it now.</p>
      <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg bg-secondary px-3.5 py-3 font-mono text-sm leading-relaxed">{text}</pre>
      <div data-print-hide className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {copied ? 'Copied' : 'Copy message'}
        </button>
        <a
          href={whatsappHref(text, phone)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-lg border px-5 text-sm font-semibold hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {phone ? 'Send on WhatsApp' : 'Open WhatsApp'}
        </a>
      </div>
    </div>
  );
}
