import { BRAND } from '../brand.ts';
import { sheetPages } from '../runner/paper.ts';

/**
 * The printable answer sheet for paper mode (D22). Built to be read back from
 * a phone photo: large line numbers, the session code on every page, wide
 * margins a thumb can hold without covering ink. No name field — a scan
 * carries the code, never the candidate (D21).
 */
interface Props {
  title: string;
  short: string;
  lines: number;
  perPage: number;
  /** A valid session code, or null for a sheet printed before any session. */
  code: string | null;
}

export function AnswerSheet({ title, short, lines, perPage, code }: Props) {
  const pages = sheetPages(lines, perPage);

  return (
    <>
      {pages.map((numbers, p) => (
        <section
          key={numbers[0]}
          data-testid="sheet-page"
          aria-label={`Page ${p + 1} of ${pages.length}`}
          className="sheet-page mx-auto mb-6 w-full max-w-[210mm] bg-white px-[12mm] py-[10mm] text-[#0F1D4A] shadow-card"
        >
          <header className="flex items-end justify-between gap-4 border-b-2 border-[#0F1D4A] pb-2">
            <div>
              <p className="text-[9pt] font-semibold uppercase tracking-[0.14em] text-[#55657F]">{BRAND.name} · {short} answer sheet</p>
              <h1 className="text-[14pt] font-bold leading-tight">{title}</h1>
            </div>
            <div className="text-right">
              <p className="text-[8pt] font-semibold uppercase tracking-[0.14em] text-[#55657F]">Session code</p>
              <p
                data-testid="code-box"
                className="mt-0.5 inline-flex h-[9mm] min-w-[34mm] items-center justify-center rounded border-2 border-[#0F1D4A] px-2 font-mono text-[14pt] font-semibold tracking-[0.12em]"
              >
                {code ?? ''}
              </p>
            </div>
          </header>

          {p === 0 && (
            <p className="mt-2 text-[9pt] text-[#55657F]">
              One sentence per numbered line. If you run out of time, leave the line blank — never skip it.
            </p>
          )}

          <ol className="mt-2">
            {numbers.map((n) => (
              <li key={n} className="flex h-[7.8mm] items-end gap-3 border-b border-[#B8C4DA]">
                <span data-testid="line-number" className="w-[9mm] shrink-0 pb-0.5 text-right text-[11pt] font-semibold tabular-nums">
                  {n}
                </span>
              </li>
            ))}
          </ol>

          <footer className="mt-2 flex justify-between text-[8pt] text-[#55657F]">
            <span>{code ?? ''}</span>
            <span>
              Page {p + 1} of {pages.length}
            </span>
          </footer>
        </section>
      ))}
    </>
  );
}
