import { BRAND } from '../brand.ts';

/**
 * The TAT answer sheet (D36) for paper mode (D22, D38): twelve numbered story
 * boxes, two to an A4 page, the twelfth for the blank slide. Built to be read
 * back from phone photos: the session code on every page, wide margins, no
 * name field (D21), and six pages — within the eight the upload takes (0017).
 */

const STORIES = 12;
const PER_PAGE = 2;
const LINES = 13;
const INK = 'text-[#0F1D4A]';
const MUTED = 'text-[#55657F]';

export function TatSheet({ code }: { code: string | null }) {
  const pages = Array.from({ length: STORIES / PER_PAGE }, (_, p) => Array.from({ length: PER_PAGE }, (_, i) => p * PER_PAGE + i + 1));
  return (
    <>
      {pages.map((stories, p) => (
        <section
          key={p}
          data-testid="sheet-page"
          aria-label={`Page ${p + 1} of ${pages.length}`}
          className={`sheet-page mx-auto mb-6 w-full max-w-[210mm] bg-white px-[12mm] py-[8mm] ${INK} shadow-card`}
        >
          <header className="flex items-end justify-between gap-4 border-b-2 border-[#0F1D4A] pb-2">
            <div>
              <p className={`text-[9pt] font-semibold uppercase tracking-[0.14em] ${MUTED}`}>{BRAND.name} · TAT answer sheet</p>
              <h1 className="text-[14pt] font-bold leading-tight">Thematic Apperception Test</h1>
            </div>
            <div className="text-right">
              <p className={`text-[8pt] font-semibold uppercase tracking-[0.14em] ${MUTED}`}>Session code</p>
              <p data-testid="code-box" className="mt-0.5 inline-flex h-[9mm] min-w-[34mm] items-center justify-center rounded border-2 border-[#0F1D4A] px-2 font-mono text-[14pt] font-semibold tracking-[0.12em]">
                {code ?? ''}
              </p>
            </div>
          </header>

          {p === 0 && (
            <p className={`mt-2 text-[9pt] ${MUTED}`}>
              30 s to look, 4 min to write each story: what led to it, what happens, how it ends. Write the code on every page; photograph each page flat, in good light.
            </p>
          )}

          {stories.map((n) => (
            <div key={n} data-testid="story-box" className="mt-4">
              <h2 className="text-[11pt] font-bold">
                Story {n}
                {n === STORIES ? ' · blank slide' : ''}
              </h2>
              <ol>
                {Array.from({ length: LINES }, (_, i) => (
                  <li key={i} data-testid="story-line" className="h-[7.6mm] border-b border-[#B8C4DA]" />
                ))}
              </ol>
            </div>
          ))}

          <footer className={`mt-2 flex justify-between text-[8pt] ${MUTED}`}>
            <span>{code ?? ''}</span>
            <span>
              Page {p + 1} of {pages.length} · {BRAND.domain}
            </span>
          </footer>
        </section>
      ))}
    </>
  );
}
