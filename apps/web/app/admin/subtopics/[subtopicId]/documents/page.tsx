import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAdminPath, buildAdminHref } from '@/lib/adminPath';
import { deleteDocument } from '@/app/admin/subtopics/[subtopicId]/documents/actions';

export const dynamic = 'force-dynamic';

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export default async function DocumentsPage({ params }: { params: { subtopicId: string } }) {
  const subtopicId = Number(params.subtopicId);
  if (!subtopicId) {
    notFound();
  }

  const subtopic = await prisma.subtopic.findUnique({
    where: { id: subtopicId },
    include: {
      topic: { include: { page: true } },
      documents: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!subtopic) {
    notFound();
  }

  const adminPath = getAdminPath();
  const returnTo = buildAdminHref(adminPath, `/subtopics/${subtopic.id}/documents`);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Subtopic</p>
            <h2 className="text-2xl font-semibold">{subtopic.title}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {subtopic.topic.page.title} {' > '} {subtopic.topic.title}
            </p>
          </div>
          <Link
            href={buildAdminHref(adminPath, `/topics/${subtopic.topicId}/subtopics`)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
          >
            Back to Subtopics
          </Link>
        </div>
        <form
          action="/api/admin/documents/upload"
          method="post"
          encType="multipart/form-data"
          className="mt-6 grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]"
        >
          <input type="hidden" name="subtopicId" value={subtopic.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input
            name="title"
            placeholder="Document title"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="slug"
            placeholder="Slug (optional)"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="file"
            type="file"
            accept="application/pdf"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="rounded-full bg-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Upload PDF
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {subtopic.documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        ) : null}
        <div className="space-y-4">
          {subtopic.documents.map(
            (doc: { id: number; title: string; fileName: string | null; sizeBytes: number; slug: string }) => (
            <div key={doc.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{doc.title}</h3>
                  <p className="text-xs text-slate-500">
                    {doc.fileName} - {formatBytes(doc.sizeBytes)}
                  </p>
                </div>
                <Link
                  href={`/doc/${doc.slug}`}
                  className="text-sm font-medium text-red-700 underline underline-offset-4"
                >
                  View
                </Link>
              </div>
              <div className="mt-3">
                <form action={deleteDocument}>
                  <input type="hidden" name="subtopicId" value={subtopic.id} />
                  <input type="hidden" name="documentId" value={doc.id} />
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
