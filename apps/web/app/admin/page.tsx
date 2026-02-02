import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getAdminPath, buildAdminHref } from '@/lib/adminPath';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  const [pages, topics, subtopics, documents] = await Promise.all([
    prisma.page.count(),
    prisma.topic.count(),
    prisma.subtopic.count(),
    prisma.document.count(),
  ]);

  const adminPath = getAdminPath();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <p className="mt-2 text-sm text-slate-600">Manage pages, topics, subtopics, and PDF documents.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Pages', value: pages },
            { label: 'Topics', value: topics },
            { label: 'Subtopics', value: subtopics },
            { label: 'Documents', value: documents },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Quick actions</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={buildAdminHref(adminPath, '/pages')}
            className="rounded-full bg-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Manage pages
          </Link>
        </div>
      </section>
    </div>
  );
}
