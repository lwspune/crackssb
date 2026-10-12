import type { ReactNode } from 'react';
import { getActingAcademy } from '@/lib/auth/acting-server.ts';
import { areasFor } from '@/lib/auth/routing.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { AppShell } from '@/ui/shell/AppShell.tsx';
import { AcademyPicker } from '@/ui/staff/AcademyPicker.tsx';

/** The staff app (UI.md §5.2): mentors and academy owners, and the superadmin in an academy they pick (D25). Candidates are sent back to theirs. */
export default async function StaffLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewerAt('/staff');
  const { academies, acting } = viewer.role === 'superadmin' ? await getActingAcademy(viewer) : { academies: [], acting: null };
  return (
    <AppShell area="staff" areas={areasFor(viewer.role)} viewerName={viewer.fullName}>
      {viewer.role === 'superadmin' && <AcademyPicker academies={academies} acting={acting} />}
      {children}
    </AppShell>
  );
}
