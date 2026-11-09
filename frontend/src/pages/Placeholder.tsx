import { PageHeader } from '@/layout/AppShell';
import { EmptyState } from '@/ui';

export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState title="Раздел в разработке" />
    </>
  );
}
