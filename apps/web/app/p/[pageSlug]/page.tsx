import { notFound } from 'next/navigation';
import { getPageBySlug } from '@/lib/strapi';
import { PageAccordion } from '@/components/PageAccordion';
import { RichTextRenderer } from '@/components/RichTextRenderer';

export default async function PageView({ params }: { params: { pageSlug: string } }) {
  const page = await getPageBySlug(params.pageSlug);
  if (!page) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-3xl font-semibold text-neutral-900">{page.title}</h2>
        {page.description ? (
          <div className="mt-3 text-sm text-neutral-600">
            <RichTextRenderer content={page.description} />
          </div>
        ) : null}
      </header>
      <PageAccordion page={page} />
    </div>
  );
}
