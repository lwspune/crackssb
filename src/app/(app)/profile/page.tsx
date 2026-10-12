import type { Metadata } from 'next';
import { Card, Page, PageHeader, StatusBadge } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Profile' };

/** UI.md §5.1: the PIQ is the profile; the medical self-check lives here too. */
export default function ProfilePage() {
  return (
    <Page>
      <PageHeader title="Profile" lede="Your PIQ is your profile." />

      <div className="grid gap-4 md:grid-cols-2">
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
