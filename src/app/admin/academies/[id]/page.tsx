import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { addPeople } from '@/app/actions/people.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { AddPeopleForm } from '@/ui/staff/AddPeopleForm.tsx';
import { PeopleTable } from '@/ui/staff/PeopleTable.tsx';
import type { PersonRow } from '@/ui/staff/PeopleTable.tsx';

export const metadata: Metadata = { title: 'Academy' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AcademyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireViewerAt(`/admin/academies/${id}`);
  if (!UUID.test(id)) notFound();
  const supabase = await createSupabaseServer();
  const [{ data: org }, { data: people }] = await Promise.all([
    supabase.from('organisations').select('id, name, slug').eq('id', id).maybeSingle(),
    supabase.from('profiles').select('id, full_name, email, role, dob, guardian_consent_at, created_at').eq('org_id', id).order('role').order('full_name'),
  ]);
  if (!org) notFound();

  return (
    <Page>
      <Link href="/admin/academies" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← Academies</Link>
      <PageHeader title={org.name} lede={org.slug} />
      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="add-h">
          <h2 id="add-h" className="mb-4 text-lg font-bold">Add people</h2>
          <AddPeopleForm action={addPeople.bind(null, { orgId: org.id })} roles={['org_admin', 'mentor', 'candidate']} />
        </section>
        <section aria-labelledby="people-h">
          <h2 id="people-h" className="mb-4 text-lg font-bold">People</h2>
          {people && people.length > 0 ? <PeopleTable people={people as PersonRow[]} /> : <p className="text-sm text-muted-foreground">No one yet.</p>}
        </section>
      </div>
    </Page>
  );
}
