import { notFound } from 'next/navigation';
import { getPageBySlug } from '@/lib/content';
import { PageAccordion } from '@/components/PageAccordion';

export const dynamic = 'force-dynamic';

export default async function PageView({ params }: { params: { pageSlug: string } }) {
  const page = await getPageBySlug(params.pageSlug);
  if (!page) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-3xl font-semibold text-neutral-900">{page.title}</h2>
      </header>
      <PageAccordion page={page} />
    </div>
  );
}
