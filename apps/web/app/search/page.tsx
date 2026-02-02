import Link from 'next/link';
import { searchDocuments } from '@/lib/strapi';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = typeof searchParams.q === 'string' ? searchParams.q.trim() : '';
  const results = query ? await searchDocuments(query) : [];

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-sm">
        <h2 className="text-3xl font-semibold text-neutral-900">Search documents</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Search by document title. Results include the page, topic, and subtopic path.
        </p>
        <form action="/search" className="mt-4 flex flex-wrap gap-3">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="e.g. safety plan"
            className="w-full max-w-md rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200"
          />
          <button
            type="submit"
            className="rounded-full bg-red-700 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Search
          </button>
        </form>
      </header>

      {query && results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/70 p-6 text-center text-sm text-neutral-500">
          No documents found for "{query}". Try a different keyword.
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="space-y-4">
          {results.map((result) => (
            <div key={result.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-neutral-900">{result.title}</h3>
                <Link
                  href={`/doc/${result.slug}`}
                  className="text-sm font-medium text-red-700 underline underline-offset-4"
                >
                  Open document
                </Link>
              </div>
              <p className="mt-2 text-sm text-neutral-600">
                {result.path.page?.title ?? 'Page'}
                {result.path.topic?.title ? ` > ${result.path.topic.title}` : ''}
                {result.path.subtopic?.title ? ` > ${result.path.subtopic.title}` : ''}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {!query ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          Enter a keyword above to search documents across all pages.
        </div>
      ) : null}
    </div>
  );
}
