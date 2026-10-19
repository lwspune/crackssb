import type { ReactNode } from 'react';

/**
 * A WAT attempt's result (D38). On paper: the session code, the sheet's
 * photos (the upload, for the candidate who took it), and the sixty words in
 * order to check the sheet against. A typed attempt, from before WAT went
 * paper-only, shows each response beside its word. Review — a mentor's or
 * the AI's — comes later. Server-renderable.
 */

interface Props {
  readonly words: readonly string[];
  readonly paperCode: string | null;
  /** Typed only: responses by item number. Null on paper. */
  readonly responses: Readonly<Record<string, string>> | null;
  readonly sheet?: ReactNode;
}

export function WatResult({ words, paperCode, responses, sheet }: Props) {
  const paper = paperCode !== null;
  return (
    <div className="space-y-8">
      {paper && (
        <section className="rounded-xl border border-dashed p-5">
          <p className="font-semibold">Your sentences are on your sheet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Session code <span className="font-mono font-semibold text-foreground">{paperCode}</span>. Photograph every page, flat, in good light.
          </p>
        </section>
      )}
      {paper && sheet}

      <section aria-labelledby="words-h">
        <h2 id="words-h" className="text-lg font-bold">{paper ? 'Check your sheet against the words' : 'Your responses'}</h2>
        <ol aria-label="The words" className="mt-4 divide-y overflow-hidden rounded-xl border bg-card shadow-card">
          {words.map((word, i) => {
            const text = (responses?.[String(i)] ?? '').trim();
            return (
              <li key={i} className="grid grid-cols-[2.5rem_minmax(0,9rem)_minmax(0,1fr)] gap-3 px-4 py-3 text-sm sm:grid-cols-[2.5rem_minmax(0,12rem)_minmax(0,1fr)]">
                <span className="tabular-nums text-muted-foreground">{i + 1}</span>
                <span className="font-semibold uppercase tracking-wide">{word}</span>
                {paper ? null : text ? <span className="font-serif text-base">{text}</span> : <span className="italic text-muted-foreground">Blank</span>}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
