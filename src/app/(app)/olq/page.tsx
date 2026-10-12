import type { Metadata } from 'next';
import { OLQ_GROUPS, olqLabel } from '@/ui/olq.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'OLQ evidence' };

/**
 * UI.md §7 rule 4: no number without evidence. Each quality shows only what
 * has been observed and where — never a radar chart, which would draw the
 * spokes no test has measured.
 */
export default function OlqPage() {
  return (
    <Page>
      <PageHeader title="OLQ evidence" lede="Fifteen qualities. Each shown only with proof." />

      <div className="grid gap-4 md:grid-cols-2">
        {OLQ_GROUPS.map(({ factor, olqs }, i) => (
          <section key={factor} aria-labelledby={`f-${i}`} className="rise overflow-hidden rounded-xl border bg-card shadow-card">
            <h2 id={`f-${i}`} className="flex items-center justify-between border-b bg-secondary/50 px-5 py-3">
              <span className="eyebrow text-muted-foreground">{factor}</span>
              <span className="text-xs tabular-nums text-muted-foreground">0 / {olqs.length}</span>
            </h2>
            <ul className="divide-y">
              {olqs.map((olq) => (
                <li key={olq} className="flex items-center justify-between gap-4 px-5 py-3">
                  <span className="font-medium">{olqLabel(olq)}</span>
                  <span className="text-xs text-muted-foreground">Not observed</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Page>
  );
}
