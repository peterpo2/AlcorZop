import Link from 'next/link';
import { getMenuPages } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const pages = await getMenuPages().catch(() => []);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[32px] border border-red-900/10 bg-white/80 p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-red-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-40 w-40 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.3em] text-red-600">Knowledge Portal</p>
          <h2 className="mt-2 text-4xl font-semibold text-neutral-900">Welcome to the AlcorZop Library</h2>
          <p className="mt-4 max-w-2xl text-base text-neutral-600">
            Browse curated pages, expand topics, and open documents without leaving the portal. Content updates
            immediately as the admin team publishes new material.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-neutral-600">
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1">Pages</span>
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1">Topics</span>
            <span className="rounded-full border border-neutral-200 bg-white px-3 py-1">Documents</span>
          </div>
        </div>
      </section>

      {pages.length > 0 ? (
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
      ) : (
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white/70 p-8 text-center text-sm text-neutral-500">
          No pages published yet. Create your first Page in the admin portal to begin.
        </div>
      )}
    </div>
  );
}
