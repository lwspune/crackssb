import type { Metadata } from 'next';
import { changeMyPassword } from '@/app/actions/account.ts';
import { signOut } from '@/app/login/actions.ts';
import { getViewer } from '@/lib/auth/viewer.ts';
import { createSupabaseServer } from '@/lib/supabase/server.ts';
import { ChangePasswordForm } from '@/ui/auth/ChangePasswordForm.tsx';
import { Card, Page, PageHeader, StatusBadge } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Profile' };

/** UI.md §5.1: the PIQ is the profile; the medical self-check lives here too. */
export default async function ProfilePage() {
  const viewer = await getViewer();
  const { data: me } = viewer ? await (await createSupabaseServer()).from('profiles').select('email').eq('id', viewer.id).maybeSingle() : { data: null };
  return (
    <Page>
      <PageHeader title="Profile" lede="Your PIQ is your profile." />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-5 py-4 shadow-card">
        <p>
          <span className="block text-xs text-muted-foreground">Signed in as</span>
          <span className="font-semibold">{viewer?.fullName}</span>
        </p>
        <form action={signOut}>
          <button type="submit" className="inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold hover:bg-secondary">
            Sign out
          </button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {viewer && me && (
          <Card className="rise md:row-span-2">
            <h2 className="font-semibold">Password</h2>
            <div className="mt-4">
              <ChangePasswordForm action={changeMyPassword} who={{ email: me.email, fullName: viewer.fullName }} />
            </div>
          </Card>
        )}
        <Card className="rise">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold">Personal Information Questionnaire</h2>
            <StatusBadge availability="coming" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">The form your interview is built from.</p>
        </Card>
        <Card className="rise">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold">Medical self-check</h2>
            <StatusBadge availability="coming" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Your entry&rsquo;s standards, by fixed rules.</p>
        </Card>
      </div>
    </Page>
  );
}
