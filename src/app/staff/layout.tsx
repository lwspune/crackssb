import type { ReactNode } from 'react';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { AppShell } from '@/ui/shell/AppShell.tsx';

/** The staff app (UI.md §5.2): mentors and academy owners. Candidates are sent back to theirs. */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewerAt('/staff');
  return (
    <AppShell area="staff" viewerName={viewer.fullName}>
      {children}
    </AppShell>
  );
}
