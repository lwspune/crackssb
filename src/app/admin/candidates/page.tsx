import type { Metadata } from 'next';
import Link from 'next/link';
import { candidateRows, searchCandidates } from '@/admin/candidates.ts';
import { loadSoloCandidates, loadSoloSessions } from '@/lib/admin/candidates.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { ArrowIcon, PeopleIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Candidates' };

const day = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/** Candidates with no academy (D42): who joined, how, and what they have taken. The owner's view only. */
export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  await requireViewerAt('/admin/candidates');
  const raw = (await searchParams).q;
  const q = typeof raw === 'string' ? raw.slice(0, 100) : '';

  const client = await createSupabaseServer();
  const [people, sessions] = await Promise.all([loadSoloCandidates(client), loadSoloSessions(client)]);
  const all = candidateRows(people, sessions);
  const rows = searchCandidates(all, q);
  const google = all.filter((r) => r.joinedVia === 'google').length;

  return (
    <Page>
      <PageHeader title="Candidates" lede={`No academy · ${all.length} in all, ${google} by Google.`} />
      <div className="max-w-3xl space-y-6">
        <form role="search" className="flex gap-2">
          <label htmlFor="q" className="sr-only">Search by name or email</label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name or email"
            className="block min-h-12 w-full min-w-0 rounded-lg border bg-card px-3.5 text-base shadow-card focus:border-brand-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-ring"
          />
          <button type="submit" className="min-h-12 shrink-0 rounded-lg bg-brand px-5 font-semibold text-brand-foreground hover:bg-brand/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Search
          </button>
        </form>

        {rows.length > 0 ? (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/candidates/${r.id}`}
                  className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 hover:bg-secondary/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{r.fullName}</span>
                      {r.deactivated && <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">Off</span>}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">{r.email}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Joined {day.format(new Date(r.joinedAt))} · {r.joinedVia === 'google' ? 'Google' : 'by you'}
                      {r.byTest.length > 0 && ` · ${r.byTest.map((t) => `${t.label} ${t.count}`).join(' · ')}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-right">
                    <span>
                      <span className="block text-lg font-bold tabular-nums">{r.attempts}<span className="sr-only"> tests taken</span></span>
                      <span className="block text-xs text-muted-foreground">{r.lastTestAt ? `last ${day.format(new Date(r.lastTestAt))}` : 'none yet'}</span>
                    </span>
                    <ArrowIcon aria-hidden="true" width={16} height={16} className="text-muted-foreground" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<PeopleIcon />} title={q ? `No one matches “${q}”.` : 'No candidates without an academy yet.'} />
        )}
      </div>
    </Page>
  );
}
