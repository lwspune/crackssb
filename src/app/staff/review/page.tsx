import type { Metadata } from 'next';
import { ReviewIcon } from '@/ui/icons.tsx';
import { EmptyState, Page, PageHeader } from '@/ui/parts.tsx';

export const metadata: Metadata = { title: 'Review queue' };

export default function ReviewPage() {
  return (
    <Page>
      <PageHeader title="Review queue" lede="AI evaluations waiting for a human second opinion." />
      <EmptyState icon={<ReviewIcon />} title="Nothing to review until scoring is switched on." />
    </Page>
  );
}
