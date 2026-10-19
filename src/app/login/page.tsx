import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth/viewer.ts';
import { googleSignInError, homeFor } from '@/lib/auth/routing.ts';
import { BRAND } from '@/ui/brand.ts';
import { Mark } from '@/ui/icons.tsx';
import { Contours } from '@/ui/parts.tsx';
import { GoogleSignIn } from '@/ui/auth/GoogleSignIn.tsx';
import { LoginForm } from '@/ui/auth/LoginForm.tsx';
import { signIn, signInWithGoogle } from './actions.ts';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

type Search = Promise<{ next?: string | string[]; error?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));

  // Passed through to the action, which validates it (safeNext) before using it.
  const search = await searchParams;
  const raw = search.next;
  const next = typeof raw === 'string' && raw.length <= 300 ? raw : null;
  // Only a known code shows a message (googleSignInError); anything else in the link shows nothing.
  const googleError = googleSignInError(typeof search.error === 'string' ? search.error : null);

  return (
    <main className="grid min-h-dvh md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section data-surface="navy" className="relative isolate overflow-hidden bg-navy px-6 py-10 text-navy-foreground sm:px-10 md:flex md:flex-col md:justify-between md:py-14">
        <Contours className="-right-40 bottom-0 -z-10 w-[56rem] text-navy-border" />
        <div aria-hidden="true" className="absolute -left-24 -top-24 -z-10 size-80 rounded-full bg-navy-accent/20 blur-3xl" />
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10">
            <Mark width={22} height={22} className="text-navy-accent" />
          </span>
          <span className="text-lg font-bold tracking-tight">
            {BRAND.lead}<span className="text-navy-accent">{BRAND.accent}</span>
          </span>
        </div>
        <div className="mt-10 md:mt-0">
          <h2 className="text-3xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            Five days.
            <br />
            One clock.
          </h2>
          <p className="mt-3 text-navy-muted">Practised by day, on the real timer.</p>
        </div>
        <p className="mt-10 hidden text-xs text-navy-muted md:block">{BRAND.tagline} · NDA</p>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="rise w-full max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">New here? Continue with Google.</p>
          <div className="mt-8 space-y-6">
            {googleError && (
              <p role="alert" className="rounded-lg bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">
                {googleError}
              </p>
            )}
            <GoogleSignIn action={signInWithGoogle} next={next} />
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
              Academy login
              <span aria-hidden="true" className="h-px flex-1 bg-border" />
            </div>
            <LoginForm action={signIn} next={next} />
          </div>
        </div>
      </section>
    </main>
  );
}
