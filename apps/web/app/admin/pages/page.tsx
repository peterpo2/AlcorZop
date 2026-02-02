import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminPath, buildAdminHref } from '@/lib/adminPath';
import { createPage, deletePage, updatePage } from '@/app/admin/pages/actions';

export const dynamic = 'force-dynamic';

export default async function AdminPages() {
  const pages = await prisma.page.findMany({
    orderBy: { order: 'asc' },
  });
  const adminPath = getAdminPath();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Pages</h2>
        <p className="mt-2 text-sm text-slate-600">Create pages and manage their topics.</p>
        <form action={createPage} className="mt-6 grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
          <input
            name="title"
            placeholder="Page title"
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
            Add page
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          {pages.length === 0 ? (
            <p className="text-sm text-slate-500">No pages created yet.</p>
          ) : null}
          {pages.map((page: { id: number; title: string; slug: string; order: number }) => (
            <div key={page.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <form action={updatePage} className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_auto]">
                <input type="hidden" name="pageId" value={page.id} />
                <input
                  name="title"
                  defaultValue={page.title}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  required
                />
                <input
                  name="slug"
                  defaultValue={page.slug}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  name="order"
                  type="number"
                  defaultValue={page.order}
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
                  href={buildAdminHref(adminPath, `/pages/${page.id}/topics`)}
                  className="text-sm font-medium text-red-700 underline underline-offset-4"
                >
                  Manage topics
                </Link>
                <form action={deletePage}>
                  <input type="hidden" name="pageId" value={page.id} />
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
