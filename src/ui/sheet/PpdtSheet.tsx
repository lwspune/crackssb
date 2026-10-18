import { BRAND } from '../brand.ts';

/**
 * The PPDT answer sheet (D33) for paper mode (D22): one A4 page laid out as
 * the SSB's — the character box (how many, then each one's sex, age and mood,
 * then the action), then ruled lines for the story. Built to be read back
 * from a phone photo: the session code on it, wide margins, no name field (D21).
 */

const PEOPLE = 6;
const LINES = 22;
const INK = 'text-[#0F1D4A]';
const MUTED = 'text-[#55657F]';

export function PpdtSheet({ code }: { code: string | null }) {
  return (
    <section data-testid="sheet-page" aria-label="PPDT answer sheet" className={`sheet-page mx-auto mb-6 w-full max-w-[210mm] bg-white px-[12mm] py-[8mm] ${INK} shadow-card`}>
      <header className="flex items-end justify-between gap-4 border-b-2 border-[#0F1D4A] pb-2">
        <div>
          <p className={`text-[9pt] font-semibold uppercase tracking-[0.14em] ${MUTED}`}>{BRAND.name} · PPDT answer sheet</p>
          <h1 className="text-[14pt] font-bold leading-tight">Picture Perception Test</h1>
        </div>
        <div className="text-right">
          <p className={`text-[8pt] font-semibold uppercase tracking-[0.14em] ${MUTED}`}>Session code</p>
          <p data-testid="code-box" className="mt-0.5 inline-flex h-[9mm] min-w-[34mm] items-center justify-center rounded border-2 border-[#0F1D4A] px-2 font-mono text-[14pt] font-semibold tracking-[0.12em]">
            {code ?? ''}
          </p>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-[auto_1fr] items-start gap-x-6">
        <div>
          <p className="flex items-center gap-2 text-[10pt] font-semibold">
            Characters seen
            <span className="inline-block h-[8mm] w-[12mm] rounded border-2 border-[#0F1D4A]" />
          </p>
          <table className="mt-2 border-collapse text-[9pt]">
            <thead>
              <tr>
                <th className="w-[8mm] border border-[#0F1D4A] px-1 py-0.5 font-semibold">#</th>
                <th className="w-[16mm] border border-[#0F1D4A] px-1 py-0.5 font-semibold">Sex (M/F)</th>
                <th className="w-[14mm] border border-[#0F1D4A] px-1 py-0.5 font-semibold">Age</th>
                <th className="w-[22mm] border border-[#0F1D4A] px-1 py-0.5 font-semibold">Mood (+ 0 −)</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: PEOPLE }, (_, i) => (
                <tr key={i} data-testid="character-row" className="h-[7mm]">
                  <td className="border border-[#0F1D4A] text-center font-semibold tabular-nums">{i + 1}</td>
                  <td className="border border-[#0F1D4A]" />
                  <td className="border border-[#0F1D4A]" />
                  <td className="border border-[#0F1D4A]" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={`text-[9pt] ${MUTED}`}>
          <p className="font-semibold text-[#0F1D4A]">How it runs</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>30 s: look at the picture. It shows once.</li>
            <li>1 min: fill the box — how many, then each one&rsquo;s sex, age, mood.</li>
            <li>4 min: write the story — what led to it, what happens, how it ends.</li>
          </ol>
          <p className="mt-2">Write the session code in the box above. After, photograph the sheet flat, in good light.</p>
        </div>
      </div>

      <p className="mt-3 flex items-end gap-2 border-b border-[#B8C4DA] pb-1 text-[10pt] font-semibold">
        Action:<span className="flex-1" />
      </p>

      <p className="mt-4 text-[10pt] font-semibold">Story</p>
      <ol>
        {Array.from({ length: LINES }, (_, i) => (
          <li key={i} data-testid="story-line" className="h-[7.2mm] border-b border-[#B8C4DA]" />
        ))}
      </ol>

      <footer className={`mt-2 flex justify-between text-[8pt] ${MUTED}`}>
        <span>{code ?? ''}</span>
        <span>{BRAND.domain}</span>
      </footer>
    </section>
  );
}
