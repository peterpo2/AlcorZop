import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white/80 p-10 text-center shadow-sm">
      <h2 className="text-3xl font-semibold text-neutral-900">Page not found</h2>
      <p className="mt-3 text-sm text-neutral-600">The content you requested is not available.</p>
      <Link
        href="/"
        className="mt-6 inline-flex rounded-full bg-red-700 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white"
      >
        Back to home
      </Link>
    </div>
  );
}
