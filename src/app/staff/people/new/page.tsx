import type { Metadata } from 'next';
import Link from 'next/link';
import { addPeople } from '@/app/actions/people.ts';
import { getActingAcademy } from '@/lib/auth/acting-server.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import type { Role } from '@/lib/auth/routing.ts';
import { PeopleIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';
import { AddPeopleForm } from '@/ui/staff/AddPeopleForm.tsx';

export const metadata: Metadata = { title: 'Add people' };

export default async function AddPeoplePage() {
  const viewer = await requireViewerAt('/staff/people/new');
  const { acting } = await getActingAcademy(viewer);
  // What the screen offers; the database decides what is allowed (can_create_person).
  const roles: Role[] =
    viewer.role === 'superadmin' ? ['org_admin', 'mentor', 'candidate'] : viewer.role === 'org_admin' ? ['candidate', 'mentor'] : ['candidate'];

  return (
    <Page>
      <Link href="/staff/people" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">
        ← People
      </Link>
      <PageHeader title="Add people" lede={acting ? `To ${acting.name}. Each gets a login and a password to hand out. Nothing is emailed.` : undefined} />
      {acting ? (
        <div className="max-w-2xl">
          {/* Staff: the action ignores this and uses their own academy. */}
          <AddPeopleForm action={addPeople.bind(null, { orgId: acting.id })} roles={roles} />
        </div>
      ) : (
        <EmptyState icon={<PeopleIcon />} title="Pick an academy above." />
      )}
    </Page>
  );
}
