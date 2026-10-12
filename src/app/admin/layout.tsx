import type { ReactNode } from 'react';
import { areasFor } from '@/lib/auth/routing.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { AppShell } from '@/ui/shell/AppShell.tsx';

/** The superadmin's platform view (UI.md §5.3). Never merged with an academy owner's. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewerAt('/admin');
  return (
    <AppShell area="admin" areas={areasFor(viewer.role)} viewerName={viewer.fullName}>
      {children}
    </AppShell>
  );
}
