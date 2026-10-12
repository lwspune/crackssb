import type { Metadata } from 'next';
import { ResultsIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Results' };

export default function ResultsPage() {
  return (
    <Page>
      <PageHeader title="Results" lede="Debriefs, drawn from your own words." />
      <EmptyState icon={<ResultsIcon />} title="No debriefs yet." href="/practise" action="Practise" />
    </Page>
  );
}
