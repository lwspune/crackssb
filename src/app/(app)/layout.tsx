import type { ReactNode } from 'react';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { AppShell } from '@/ui/shell/AppShell.tsx';

/** The student app. Candidates only; staff are sent to their own app. Row level security still guards every query. */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewerAt('/');
  return <AppShell viewerName={viewer.fullName}>{children}</AppShell>;
}
