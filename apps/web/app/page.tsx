import Link from 'next/link';
import { getMenuPages } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const pages = await getMenuPages().catch(() => []);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-neutral-200 bg-white/80 p-8 shadow-sm">
        <h2 className="text-3xl font-semibold text-neutral-900">Welcome</h2>
        <p className="mt-3 max-w-2xl text-neutral-600">
          Browse pages, expand topics, and open documents without leaving the portal. Content updates immediately in
          the admin portal.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {pages.map((page) => (
          <Link
            key={page.id}
            href={`/p/${page.slug}`}
            className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-red-200"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-neutral-900">{page.title}</h3>
              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                View
              </span>
            </div>
            <p className="mt-3 text-sm text-neutral-500">Explore topics and document collections.</p>
          </Link>
        ))}
      </section>

      {pages.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-8 text-center text-sm text-neutral-500">
          No pages published yet. Create your first Page in the admin portal to begin.
        </div>
      ) : null}
    </div>
  );
}
