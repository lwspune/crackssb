import type { Metadata } from 'next';
import Link from 'next/link';
import { signInWithGoogle } from '@/app/login/actions.ts';
import { jsonLd, siteJsonLd } from '@/lib/site.ts';
import { GoogleSignIn } from '@/ui/auth/GoogleSignIn.tsx';
import { BRAND } from '@/ui/brand.ts';
import { CATALOG, SSB_DAYS, entriesForDay } from '@/ui/catalog.ts';
import { ArrowIcon, Mark } from '@/ui/icons.tsx';
import { Contours, StatusBadge } from '@/ui/parts.tsx';

/**
 * The landing page: what a visitor with no session sees at `/` (the proxy
 * rewrites to it; LANDING in routing.ts). Static, so search and AI crawlers get
 * it whole. Every test and figure comes from the catalogue, which cannot claim
 * a test the runner cannot run; the honest-claims policy (ARCHITECTURE.md §9)
 * holds for every line.
 */

const TITLE = 'SSB Interview Preparation for NDA';
const DESCRIPTION = 'Practise the SSB by day on its real timings: OIR mocks, PPDT, TAT, WAT, SRT and SDT. Written on paper, marked by a mentor.';

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | ${BRAND.name}` },
  description: DESCRIPTION,
  // No openGraph here: a page's own openGraph replaces the root's, share image included. Next fills og:title and og:description from these.
  alternates: { canonical: '/' },
};

const READY = CATALOG.filter((e) => e.availability === 'ready');

const STEPS = [
  { title: 'Print the sheet.', line: 'Printable answer sheets, a code on every page.' },
  { title: 'Write on the clock.', line: 'SSB timings, kept by the server. Pick up on any device.' },
  { title: 'Get marked.', line: 'Photograph your sheet. A mentor marks your own words.' },
];

function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10">
        <Mark width={22} height={22} className="text-navy-accent" />
      </span>
      <span className="text-lg font-bold tracking-tight">
        {BRAND.lead}<span className="text-navy-accent">{BRAND.accent}</span>
      </span>
    </span>
  );
}

export default function LandingPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(siteJsonLd()) }} />

      <header data-surface="navy" className="bg-navy text-navy-foreground">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 md:px-10">
          <Wordmark />
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-navy-ring">
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section data-surface="navy" aria-labelledby="hero-h" className="relative isolate overflow-hidden bg-navy text-navy-foreground">
          <Contours className="-right-40 bottom-0 -z-10 w-[64rem] text-navy-border" />
          <div aria-hidden="true" className="absolute -left-24 -top-24 -z-10 size-96 rounded-full bg-navy-accent/20 blur-3xl" />
          <div className="rise mx-auto grid w-full max-w-6xl items-end gap-10 px-4 pb-14 pt-10 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:px-10 md:pb-20 md:pt-16">
            <div>
              <p className="eyebrow text-navy-accent">SSB interview preparation · NDA</p>
              <h1 id="hero-h" className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                Five days.
                <br />
                One clock.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-navy-muted">OIR, PPDT and the four psychology tests on SSB timings. Written on paper, marked by a mentor.</p>
            </div>
            <div className="rounded-xl bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur-sm sm:p-6">
              <p className="text-sm font-semibold">Start practising</p>
              <div className="mt-4 text-foreground">
                <GoogleSignIn action={signInWithGoogle} next={null} />
              </div>
              <Link href="/login" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-navy-accent hover:underline">
                Academy login <ArrowIcon width={16} height={16} />
              </Link>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-10">
          <section aria-labelledby="ready-h" className="mt-14">
            <h2 id="ready-h" className="text-xl font-bold tracking-tight">Ready now</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {READY.map((e) => (
                <li key={e.id} className="rounded-xl border bg-card p-5 shadow-card">
                  <p className="text-3xl font-bold tracking-tight">{e.short ?? e.name}</p>
                  <p className="mt-1 text-sm font-semibold">{e.name}</p>
                  <p className="mt-3 text-sm tabular-nums text-muted-foreground">{e.summary}</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="days-h" className="mt-16">
            <h2 id="days-h" className="text-xl font-bold tracking-tight">The SSB, day by day</h2>
            <ol className="mt-6 divide-y rounded-xl border bg-card shadow-card">
              {SSB_DAYS.map(({ day, title, summary }) => (
                <li key={day} className="grid gap-3 p-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-6 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold tabular-nums text-brand-foreground">
                      {String(day).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-sm text-muted-foreground">{summary}</span>
                    </span>
                  </div>
                  <ul className="flex flex-wrap gap-x-5 gap-y-3">
                    {entriesForDay(day).map((e) => (
                      <li key={e.id} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{e.short ?? e.name}</span>
                        <StatusBadge availability={e.availability} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="how-h" className="mt-16">
            <h2 id="how-h" className="text-xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-xl border bg-card p-5 shadow-card">
                  <p className="text-sm font-semibold tabular-nums text-brand-accent">{String(i + 1).padStart(2, '0')}</p>
                  <p className="mt-2 text-lg font-semibold">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.line}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-muted-foreground">No model answers to copy. Assessors spot them.</p>
          </section>
        </div>
      </main>

      <footer className="mx-auto mt-16 flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 border-t px-4 py-8 text-sm text-muted-foreground sm:px-6 md:px-10">
        <span>
          {BRAND.name} · {BRAND.domain}
        </span>
        <nav aria-label="Footer" className="flex gap-2">
          <Link href="/privacy" className="inline-flex min-h-11 items-center px-2 hover:underline">Privacy</Link>
          <Link href="/login" className="inline-flex min-h-11 items-center px-2 hover:underline">Sign in</Link>
        </nav>
      </footer>
    </>
  );
}
