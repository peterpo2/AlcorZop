import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminPath, buildAdminHref } from '@/lib/adminPath';
import { createSubtopic, deleteSubtopic, updateSubtopic } from '@/app/admin/topics/[topicId]/subtopics/actions';

export const dynamic = 'force-dynamic';

export default async function SubtopicsPage({ params }: { params: { topicId: string } }) {
  const topicId = Number(params.topicId);
  if (!topicId) {
    notFound();
  }

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      page: true,
      subtopics: { orderBy: { order: 'asc' } },
    },
  });

  if (!topic) {
    notFound();
  }

  const adminPath = getAdminPath();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Topic</p>
            <h2 className="text-2xl font-semibold">{topic.title}</h2>
            <p className="mt-1 text-sm text-slate-500">Page: {topic.page.title}</p>
          </div>
          <Link
            href={buildAdminHref(adminPath, `/pages/${topic.pageId}/topics`)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
          >
            Back to Topics
          </Link>
        </div>
        <form action={createSubtopic} className="mt-6 grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
          <input type="hidden" name="topicId" value={topic.id} />
          <input
            name="title"
            placeholder="Subtopic title"
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
            Add subtopic
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {topic.subtopics.length === 0 ? (
          <p className="text-sm text-slate-500">No subtopics created yet.</p>
        ) : null}
        <div className="space-y-4">
          {topic.subtopics.map(
            (subtopic: { id: number; title: string; slug: string; order: number }) => (
            <div key={subtopic.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <form action={updateSubtopic} className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
                <input type="hidden" name="topicId" value={topic.id} />
                <input type="hidden" name="subtopicId" value={subtopic.id} />
                <input
                  name="title"
                  defaultValue={subtopic.title}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  required
                />
                <input
                  name="slug"
                  defaultValue={subtopic.slug}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  name="order"
                  type="number"
                  defaultValue={subtopic.order}
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
                  href={buildAdminHref(adminPath, `/subtopics/${subtopic.id}/documents`)}
                  className="text-sm font-medium text-red-700 underline underline-offset-4"
                >
                  Manage documents
                </Link>
                <form action={deleteSubtopic}>
                  <input type="hidden" name="topicId" value={topic.id} />
                  <input type="hidden" name="subtopicId" value={subtopic.id} />
                  <button type="submit" className="text-sm text-red-600">
                    Delete
                  </button>
                </form>
              </div>
            </div>
            )
          )}
        </div>
      </section>
    </div>
  );
}
