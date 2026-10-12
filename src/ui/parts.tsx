import Link from 'next/link';
import type { ReactNode } from 'react';
import { AVAILABILITY_LABEL } from './catalog.ts';
import type { Availability } from './catalog.ts';
import { ArrowIcon } from './icons.tsx';

/** Small shared pieces of the app surface. Nothing here is used by the runner. */

export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-10 md:py-10">{children}</div>;
}

export function PageHeader({ title, lede }: { title: string; lede?: string }) {
  return (
    <header className="rise mb-8 md:mb-10">
      <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
      {lede && <p className="mt-2 text-base text-muted-foreground">{lede}</p>}
    </header>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border bg-card p-5 shadow-card sm:p-6 ${className}`}>{children}</section>;
}

const BADGE: Readonly<Record<Availability, string>> = {
  ready: 'bg-brand/10 text-brand-accent ring-1 ring-brand/25',
  coming: 'bg-secondary text-muted-foreground',
  not_simulated: 'border border-dashed border-muted-foreground/50 text-muted-foreground',
};
const DOT: Readonly<Record<Availability, string>> = {
  ready: 'bg-brand-accent',
  coming: 'bg-muted-foreground/60',
  not_simulated: 'border border-muted-foreground',
};

export function StatusBadge({ availability }: { availability: Availability }) {
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${BADGE[availability]}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-full ${DOT[availability]}`} />
      {AVAILABILITY_LABEL[availability]}
    </span>
  );
}

/** "Says what is true" (UI.md §7 rule 3) — in one line. */
export function EmptyState({ icon, title, href, action }: { icon: ReactNode; title: string; href?: string; action?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card/60 p-4 sm:gap-4 sm:p-5">
      <span aria-hidden="true" className="hidden size-11 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground min-[360px]:grid">{icon}</span>
      <p className="flex-1 font-medium">{title}</p>
      {href && action && (
        <Link href={href} className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 px-2 text-sm font-semibold text-brand-accent hover:underline">
          {action} <ArrowIcon width={16} height={16} />
        </Link>
      )}
    </div>
  );
}

/** Faint terrain contours behind the navy panels — the one decorative motif. */
export function Contours({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 320" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true" className={`pointer-events-none absolute ${className}`}>
      <path d="M0 250C150 190 290 290 450 220S740 120 800 160" />
      <path d="M0 280C160 220 300 315 470 250S750 150 800 190" />
      <path d="M40 210C170 150 300 240 450 180S730 80 800 120" />
      <path d="M110 170C230 115 320 195 460 140S720 45 800 80" />
      <path d="M210 125C310 80 370 150 480 105S700 15 800 42" />
      <path d="M330 85C400 55 440 100 510 72S680 0 800 10" />
    </svg>
  );
}
