import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getViewer } from '@/lib/auth/viewer.ts';
import { homeFor } from '@/lib/auth/routing.ts';
import { Mark } from '@/ui/icons.tsx';
import { Contours } from '@/ui/parts.tsx';
import { LoginForm } from '@/ui/auth/LoginForm.tsx';
import { signIn } from './actions.ts';

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } };

type Search = Promise<{ next?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: Search }) {
  const viewer = await getViewer();
  if (viewer) redirect(homeFor(viewer.role));

  // Passed through to the action, which validates it (safeNext) before using it.
  const raw = (await searchParams).next;
  const next = typeof raw === 'string' && raw.length <= 300 ? raw : null;

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
            Crack<span className="text-navy-accent">SSB</span>
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
        <p className="mt-10 hidden text-xs text-navy-muted md:block">SSB preparation · NDA</p>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-10">
        <div className="rise w-full max-w-sm">
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your academy creates your login.</p>
          <div className="mt-8">
            <LoginForm action={signIn} next={next} />
          </div>
        </div>
      </section>
    </main>
  );
}
