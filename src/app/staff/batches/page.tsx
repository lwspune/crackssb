import type { Metadata } from 'next';
import { BatchIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Batches' };

export default function BatchesPage() {
  return (
    <Page>
      <PageHeader title="Batches" lede="Group candidates by SSB window." />
      <EmptyState icon={<BatchIcon />} title="Batches are coming." />
    </Page>
  );
}
