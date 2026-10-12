import type { ReactNode } from 'react';
import { areasFor } from '@/lib/auth/routing.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { AppShell } from '@/ui/shell/AppShell.tsx';

/**
 * The student app. Candidates, and staff using it as themselves (D25) — their
 * sessions are flagged by_staff in the database and left out of results.
 * Row level security still guards every query.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewerAt('/');
  return (
    <AppShell areas={areasFor(viewer.role)} viewerName={viewer.fullName}>
      {viewer.role !== 'candidate' && (
        <p role="note" className="border-b bg-accent/60 px-4 py-2.5 text-sm font-medium sm:px-6 md:px-10">
          Staff view. Your tests aren’t counted.
        </p>
      )}
      {children}
    </AppShell>
  );
}
