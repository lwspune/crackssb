'use client';

import { useSyncExternalStore } from 'react';
import { MoonIcon, SunIcon } from '../icons.tsx';

/** The theme lives on <html class="dark">, set before first paint by the root layout's script. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}
const isDark = () => document.documentElement.classList.contains('dark');

export function ThemeToggle({ compact = false, tone = 'app' }: { compact?: boolean; tone?: 'app' | 'navy' }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  const toggle = () => {
    const next = !isDark();
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // Storage blocked (private mode): the switch still works for this visit.
    }
  };

  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={compact ? label : undefined}
      className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium ${
        tone === 'navy' ? 'text-navy-muted hover:bg-white/10 hover:text-navy-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      } ${
        compact ? 'min-w-11 justify-center' : 'px-3'
      }`}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
      {!compact && <span>{dark ? 'Light theme' : 'Dark theme'}</span>}
    </button>
  );
}
