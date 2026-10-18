import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { recordConsent, removePerson, savePersonRole, saveDetails, setPersonActive, setPersonPassword } from '@/app/actions/manage.ts';
import { mayManage } from '@/db/admin/manage.ts';
import type { ManageAction } from '@/db/admin/manage.ts';
import { isMinor } from '@/lib/age.ts';
import { requireViewerAt } from '@/lib/auth/viewer.ts';
import type { Role } from '@/lib/auth/routing.ts';
import { formatPhone } from '@/lib/phone.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { Page, PageHeader } from '@/ui/parts.tsx';
import { PersonManage } from '@/ui/staff/PersonManage.tsx';
import type { Rights } from '@/ui/staff/PersonManage.tsx';
import { ROLE_LABEL } from '@/ui/staff/PeopleTable.tsx';

export const metadata: Metadata = { title: 'Person' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS: readonly ManageAction[] = ['edit', 'password', 'deactivate', 'delete', 'role'];

/**
 * One person (D31). Read under row level security, so staff reach only their
 * own academy's people; what they may change is asked of the database
 * (can_manage_person) and each control shows only when it said yes.
 */
export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireViewerAt(`/staff/people/${id}`);
  if (!UUID.test(id)) notFound();

  const supabase = await createSupabaseServer();
  const { data: p } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, dob, phone, guardian_consent_at, deactivated_at')
    .eq('id', id)
    .maybeSingle();
  if (!p) notFound();

  const answers = await Promise.all(ACTIONS.map((a) => mayManage(supabase, id, a)));
  const rights = Object.fromEntries(ACTIONS.map((a, i) => [a, answers[i]])) as unknown as Rights;
  const role = p.role as Role;
  const needsConsent = role === 'candidate' && p.dob !== null && isMinor(p.dob) && p.guardian_consent_at === null;
  const lede = [ROLE_LABEL[role], p.email, p.phone ? formatPhone(p.phone) : null].filter(Boolean).join(' · ');

  return (
    <Page>
      <Link href="/staff/people" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-accent hover:underline">← People</Link>
      <PageHeader title={p.full_name} lede={lede} />
      {(p.deactivated_at || needsConsent) && (
        <p className="-mt-4 mb-6 flex flex-wrap gap-2">
          {p.deactivated_at && <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">Switched off</span>}
          {needsConsent && <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">Needs guardian consent</span>}
        </p>
      )}
      {ACTIONS.some((a) => rights[a]) ? (
        <PersonManage
          person={{ id, fullName: p.full_name, email: p.email, role, dob: p.dob, phone: p.phone, needsConsent, deactivated: p.deactivated_at !== null }}
          rights={rights}
          actions={{
            details: saveDetails.bind(null, id),
            password: setPersonPassword.bind(null, id),
            consent: recordConsent.bind(null, id),
            role: savePersonRole.bind(null, id),
            active: setPersonActive.bind(null, id),
            remove: removePerson.bind(null, id),
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">You can see this person but not change them.</p>
      )}
    </Page>
  );
}
