import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminPath, buildAdminHref } from '@/lib/adminPath';
import { createTopic, deleteTopic, updateTopic } from '@/app/admin/pages/[pageId]/topics/actions';

export const dynamic = 'force-dynamic';

export default async function TopicsPage({ params }: { params: { pageId: string } }) {
  const pageId = Number(params.pageId);
  if (!pageId) {
    notFound();
  }

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { topics: { orderBy: { order: 'asc' } } },
  });

  if (!page) {
    notFound();
  }

  const adminPath = getAdminPath();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Page</p>
            <h2 className="text-2xl font-semibold">{page.title}</h2>
          </div>
          <Link
            href={buildAdminHref(adminPath, '/pages')}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
          >
            Back to Pages
          </Link>
        </div>
        <form action={createTopic} className="mt-6 grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
          <input type="hidden" name="pageId" value={page.id} />
          <input
            name="title"
            placeholder="Topic title"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            required
          />
          <input
            name="slug"
            placeholder="Slug (optional)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="order"
            type="number"
            defaultValue={0}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Add topic
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {page.topics.length === 0 ? (
          <p className="text-sm text-slate-500">No topics created yet.</p>
        ) : null}
        <div className="space-y-4">
          {page.topics.map((topic: { id: number; title: string; slug: string; order: number }) => (
            <div key={topic.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <form action={updateTopic} className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
                <input type="hidden" name="pageId" value={page.id} />
                <input type="hidden" name="topicId" value={topic.id} />
                <input
                  name="title"
                  defaultValue={topic.title}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  required
                />
                <input
                  name="slug"
                  defaultValue={topic.slug}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  name="order"
                  type="number"
                  defaultValue={topic.order}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700"
                >
                  Update
                </button>
              </form>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href={buildAdminHref(adminPath, `/topics/${topic.id}/subtopics`)}
                  className="text-sm font-medium text-red-700 underline underline-offset-4"
                >
                  Manage subtopics
                </Link>
                <form action={deleteTopic}>
                  <input type="hidden" name="pageId" value={page.id} />
                  <input type="hidden" name="topicId" value={topic.id} />
                  <button type="submit" className="text-sm text-red-600">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
