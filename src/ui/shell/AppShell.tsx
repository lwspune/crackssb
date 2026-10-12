'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AcademyIcon, BatchIcon, HomeIcon, Mark, OlqIcon, PeopleIcon, PractiseIcon, ProfileIcon, ResultsIcon, ReviewIcon } from '../icons.tsx';
import { signOut } from '@/app/login/actions.ts';
import type { Area } from '@/lib/auth/routing.ts';
import { AreaSwitcher } from './AreaSwitcher.tsx';
import { ThemeToggle } from './ThemeToggle.tsx';

/**
 * The app shell (UI.md §4): a navy side rail on desktop, a navy header and
 * bottom tabs on a phone, shared by every screen that is not the runner. The
 * runner renders outside it, on purpose.
 */

/** One shell, three areas (UI.md §2, layered by D25). The area is a string so a Server Component can choose it. */
export type { Area };

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly longLabel?: string;
  readonly Icon: typeof HomeIcon;
}

const NAVS: Readonly<Record<Area, readonly NavItem[]>> = {
  student: [
    { href: '/', label: 'Home', Icon: HomeIcon },
    { href: '/practise', label: 'Practise', Icon: PractiseIcon },
    { href: '/results', label: 'Results', Icon: ResultsIcon },
    { href: '/olq', label: 'OLQ', longLabel: 'OLQ evidence', Icon: OlqIcon },
    { href: '/profile', label: 'Profile', Icon: ProfileIcon },
  ],
  staff: [
    { href: '/staff/people', label: 'People', Icon: PeopleIcon },
    { href: '/staff/batches', label: 'Batches', Icon: BatchIcon },
    { href: '/staff/review', label: 'Review', longLabel: 'Review queue', Icon: ReviewIcon },
  ],
  admin: [{ href: '/admin/academies', label: 'Academies', Icon: AcademyIcon }],
};

const HOME: Readonly<Record<Area, string>> = { student: '/', staff: '/staff/people', admin: '/admin/academies' };
const TAB_COLUMNS: Readonly<Record<number, string>> = { 1: 'grid-cols-1', 3: 'grid-cols-3', 5: 'grid-cols-5' };

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark({ href }: { href: string }) {
  return (
    <Link href={href} className="inline-flex min-h-11 items-center gap-2.5 rounded-md text-navy-foreground">
      <span className="grid size-9 place-items-center rounded-lg bg-white/5 ring-1 ring-white/10">
        <Mark width={22} height={22} className="text-navy-accent" />
      </span>
      <span className="text-lg font-bold tracking-tight">
        Crack<span className="text-navy-accent">SSB</span>
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  viewerName,
  area = 'student',
  areas = [area],
}: {
  children: ReactNode;
  viewerName: string;
  area?: Area;
  /** Every area this viewer's role reaches (routing.areasFor); one area shows no switcher. */
  areas?: readonly Area[];
}) {
  const pathname = usePathname();
  const nav = NAVS[area];

  return (
    <div className="min-h-dvh md:flex">
      <a href="#content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:shadow-card">
        Skip to content
      </a>

      <aside data-surface="navy" className="hidden bg-navy text-navy-foreground md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:gap-10 md:px-4 md:py-6">
        <div className="space-y-5 px-2">
          <Wordmark href={HOME[area]} />
          <AreaSwitcher areas={areas} current={area} />
        </div>
        <nav aria-label="Main">
          <ul className="space-y-1">
            {nav.map(({ href, label, Icon, longLabel }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[0.9375rem] font-medium transition-colors ${
                      active ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]' : 'text-navy-muted hover:bg-white/5 hover:text-navy-foreground'
                    }`}
                  >
                    <Icon className={active ? 'text-navy-accent' : 'opacity-80 group-hover:opacity-100'} />
                    {longLabel ?? label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto space-y-3 border-t border-navy-border px-2 pt-5">
          <p className="truncate text-sm font-medium text-navy-foreground" title={viewerName}>{viewerName}</p>
          <div className="flex flex-wrap items-center gap-1">
            <ThemeToggle tone="navy" />
            <form action={signOut}>
              <button type="submit" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-navy-muted hover:bg-white/10 hover:text-navy-foreground">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header data-surface="navy" className="space-y-2 bg-navy px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <Wordmark href={HOME[area]} />
            <ThemeToggle tone="navy" compact />
          </div>
          <AreaSwitcher areas={areas} current={area} />
        </header>
        <main id="content" className="flex-1 pb-24 md:pb-0">
          {children}
        </main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        <ul className={`grid ${TAB_COLUMNS[nav.length] ?? 'grid-cols-5'}`}>
          {nav.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium ${
                    active ? 'text-brand-accent' : 'text-muted-foreground'
                  }`}
                >
                  {active && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-brand-accent" />}
                  <Icon />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
