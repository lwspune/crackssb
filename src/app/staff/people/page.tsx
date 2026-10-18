import type { Metadata } from 'next';
import Link from 'next/link';
import { getActingAcademy } from '@/lib/auth/acting-server.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { PeopleIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';
import { PeopleTable, PERSON_COLUMNS } from '@/ui/staff/PeopleTable.tsx';
import type { PersonRow } from '@/ui/staff/PeopleTable.tsx';

export const metadata: Metadata = { title: 'People' };

/**
 * The academy's people. Row level security returns only the viewer's own
 * academy (0001); the superadmin sees every academy, so the page narrows to
 * the one they picked (D25).
 */
export default async function PeoplePage() {
  const viewer = await requireViewerAt('/staff/people');
  const { acting } = await getActingAcademy(viewer);
  if (!acting) {
    return (
      <Page>
        <PageHeader title="People" />
        <EmptyState icon={<PeopleIcon />} title="Pick an academy above." />
      </Page>
    );
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from('profiles')
    .select(PERSON_COLUMNS)
    .eq('org_id', acting.id)
    .order('role')
    .order('full_name');
  if (error) console.error('people list failed', { code: error.code });
  const people = (data ?? []) as unknown as PersonRow[];
  const candidates = people.filter((p) => p.role === 'candidate').length;

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader title={viewer.role === 'superadmin' ? acting.name : 'People'} lede={`${candidates} candidate${candidates === 1 ? '' : 's'} · ${people.length - candidates} staff`} />
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
