import Link from 'next/link';
import { headers } from 'next/headers';
import { getAdminPath, buildAdminHref } from '@/lib/adminPath';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const adminPath = getAdminPath();
  const requestHeaders = headers();
  const isLoginPage = requestHeaders.get('x-admin-login') === '1';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin Portal</p>
            <h1 className="text-2xl font-semibold">AlcorZop Content</h1>
          </div>
          {!isLoginPage ? (
            <nav className="flex flex-wrap items-center gap-3 text-sm">
              <Link
                href={buildAdminHref(adminPath, '/')}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700"
              >
                Dashboard
              </Link>
              <Link
                href={buildAdminHref(adminPath, '/pages')}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700"
              >
                Pages
              </Link>
              <form action="/api/admin/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700"
                >
                  Logout
                </button>
              </form>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
