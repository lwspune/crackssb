import type { ReactNode } from 'react';
import { PROMPTS } from '../../sdt/prompts.ts';
import { BRAND } from '../brand.ts';

/**
 * The SRT (D39) and SDT (D40) answer sheets for paper (D22, D38). Built to be
 * read back from phone photos: the session code on every page, wide margins,
 * no name field (D21), and no more pages than the upload takes (four).
 *
 * SRT: sixty numbered answers, fifteen to a page, two lines each — the graded
 * batch's sheets held sixteen a page, and five of nine candidates stopped
 * exactly where the first page ended (CODEBOOK §3), so the numbers run on
 * without a break in the prompt. SDT: the five paragraphs, headed, over two.
 */

const INK = 'text-[#0F1D4A]';
const MUTED = 'text-[#55657F]';

function Page({ title, short, code, page, pages, children }: { title: string; short: string; code: string | null; page: number; pages: number; children: ReactNode }) {
  return (
    <section data-testid="sheet-page" aria-label={`Page ${page} of ${pages}`} className={`sheet-page mx-auto mb-6 w-full max-w-[210mm] bg-white px-[12mm] py-[8mm] ${INK} shadow-card`}>
      <header className="flex items-end justify-between gap-4 border-b-2 border-[#0F1D4A] pb-2">
        <div>
          <p className={`text-[9pt] font-semibold uppercase tracking-[0.14em] ${MUTED}`}>{BRAND.name} · {short} answer sheet</p>
          <h1 className="text-[14pt] font-bold leading-tight">{title}</h1>
        </div>
        <div className="text-right">
          <p className={`text-[8pt] font-semibold uppercase tracking-[0.14em] ${MUTED}`}>Session code</p>
          <p data-testid="code-box" className="mt-0.5 inline-flex h-[9mm] min-w-[34mm] items-center justify-center rounded border-2 border-[#0F1D4A] px-2 font-mono text-[14pt] font-semibold tracking-[0.12em]">
            {code ?? ''}
          </p>
        </div>
      </header>
      {children}
      <footer className={`mt-2 flex justify-between text-[8pt] ${MUTED}`}>
        <span>{code ?? ''}</span>
        <span>
          Page {page} of {pages} · {BRAND.domain}
        </span>
      </footer>
    </section>
  );
}

const SRT_PER_PAGE = 15;

export function SrtSheet({ code }: { code: string | null }) {
  const pages = Array.from({ length: 60 / SRT_PER_PAGE }, (_, p) => Array.from({ length: SRT_PER_PAGE }, (_, i) => p * SRT_PER_PAGE + i + 1));
  return (
    <>
      {pages.map((numbers, p) => (
        <Page key={p} title="Situation Reaction Test" short="SRT" code={code} page={p + 1} pages={pages.length}>
          {p === 0 && <p className={`mt-2 text-[9pt] ${MUTED}`}>Sixty situations, thirty minutes. One answer per number: what he does, briefly. Leave a number blank if you skip it.</p>}
          <ol className="mt-2">
            {numbers.map((n) => (
              <li key={n} data-testid="answer" className="flex gap-3">
                <span className="w-[9mm] shrink-0 pt-[1.5mm] text-right text-[11pt] font-semibold tabular-nums">{n}</span>
                <span className="flex-1">
                  {[0, 1].map((l) => (
                    <span key={l} data-testid="answer-line" className="block h-[7.4mm] border-b border-[#B8C4DA]" />
                  ))}
                </span>
              </li>
            ))}
          </ol>
        </Page>
      ))}
    </>
  );
}

const SDT_LINES = 9;

export function SdtSheet({ code }: { code: string | null }) {
  const pages = [PROMPTS.slice(0, 3), PROMPTS.slice(3)];
  return (
    <>
      {pages.map((prompts, p) => (
        <Page key={p} title="Self Description Test" short="SDT" code={code} page={p + 1} pages={pages.length}>
          {p === 0 && <p className={`mt-2 text-[9pt] ${MUTED}`}>Fifteen minutes for all five. Write in your own words; a few honest sentences for each.</p>}
          {prompts.map((prompt) => (
            <div key={prompt.key} data-testid="paragraph" className="mt-4">
              <h2 className="text-[11pt] font-bold">{prompt.text}</h2>
              <ol>
                {Array.from({ length: SDT_LINES }, (_, i) => (
                  <li key={i} data-testid="answer-line" className="h-[7.4mm] border-b border-[#B8C4DA]" />
                ))}
              </ol>
            </div>
          ))}
        </Page>
      ))}
    </>
  );
}
