import type { Metadata } from 'next';
import Link from 'next/link';
import { createAcademy } from '@/app/actions/academies.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { CreateAcademyForm } from '@/ui/admin/CreateAcademyForm.tsx';
import { AcademyIcon, ArrowIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Academies' };

export default async function AcademiesPage() {
  await requireViewerAt('/admin/academies');
  const supabase = await createSupabaseServer();
  const [{ data: orgs }, { data: people }] = await Promise.all([
    supabase.from('organisations').select('id, name, slug').order('name'),
    supabase.from('profiles').select('org_id'),
  ]);
  const count = (org: string) => (people ?? []).filter((p) => p.org_id === org).length;

  return (
    <Page>
      <PageHeader title="Academies" lede="Every tenant on the platform." />
      <div className="max-w-2xl space-y-6">
        <CreateAcademyForm action={createAcademy} />
        {orgs && orgs.length > 0 ? (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-card">
            {orgs.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/academies/${o.id}`} className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 hover:bg-secondary/60">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{o.name}</span>
                    <span className="block text-sm text-muted-foreground">{o.slug} · {count(o.id)} people</span>
                  </span>
                  <ArrowIcon className="shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<AcademyIcon />} title="No academies yet." />
        )}
      </div>
    </Page>
  );
}
