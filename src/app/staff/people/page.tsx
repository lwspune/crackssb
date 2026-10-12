import type { Metadata } from 'next';
import Link from 'next/link';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { PeopleIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';
import { PeopleTable } from '@/ui/staff/PeopleTable.tsx';
import type { PersonRow } from '@/ui/staff/PeopleTable.tsx';

export const metadata: Metadata = { title: 'People' };

/** The academy's people. Row level security returns only the viewer's own academy (0001). */
export default async function PeoplePage() {
  await requireViewerAt('/staff/people');
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, dob, guardian_consent_at, created_at')
    .order('role')
    .order('full_name');
  if (error) console.error('people list failed', { code: error.code });
  const people = (data ?? []) as PersonRow[];
  const candidates = people.filter((p) => p.role === 'candidate').length;

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="People" lede={`${candidates} candidate${candidates === 1 ? '' : 's'} · ${people.length - candidates} staff`} />
        <Link
          href="/staff/people/new"
          className="mb-8 inline-flex min-h-12 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 md:mb-10"
        >
          Add people
        </Link>
      </div>
      {people.length > 0 ? <PeopleTable people={people} /> : <EmptyState icon={<PeopleIcon />} title="No one here yet." />}
    </Page>
  );
}
