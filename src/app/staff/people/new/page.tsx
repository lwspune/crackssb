import type { Metadata } from 'next';
import Link from 'next/link';
import { addPeople } from '@/app/actions/people.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import type { Role } from '@/lib/auth/routing.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { AddPeopleForm } from '@/ui/staff/AddPeopleForm.tsx';

export const metadata: Metadata = { title: 'Add people' };

export default async function AddPeoplePage() {
  const viewer = await requireViewerAt('/staff/people/new');
  // What the screen offers; the database decides what is allowed (can_create_person).
  const roles: Role[] = viewer.role === 'org_admin' ? ['candidate', 'mentor'] : ['candidate'];

  return (
    <Page>
      <Link href="/staff/people" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">
        ← People
      </Link>
      <PageHeader title="Add people" lede="Each gets a login and a password to hand out. Nothing is emailed." />
      <div className="max-w-2xl">
        <AddPeopleForm action={addPeople.bind(null, { orgId: null })} roles={roles} />
      </div>
    </Page>
  );
}
