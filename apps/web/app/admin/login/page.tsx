import { getAdminPath } from '@/lib/adminPath';

export const dynamic = 'force-dynamic';

export default function AdminLogin({ searchParams }: { searchParams: { error?: string; next?: string } }) {
  const adminPath = getAdminPath();
  const next = typeof searchParams.next === 'string' ? searchParams.next : '';
  const error = typeof searchParams.error === 'string' ? searchParams.error : '';
  const errorMessage =
    error === 'invalid'
      ? 'Invalid email or password. Please try again.'
      : error === 'rate'
        ? 'Too many login attempts. Please wait a few minutes and try again.'
        : error === 'server'
          ? 'The login service is unavailable. Please try again shortly.'
          : '';

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Admin sign in</h2>
        <p className="mt-2 text-sm text-slate-600">Use your admin credentials to manage content.</p>
        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}
        <form method="post" action="/api/admin/login" className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value={next || adminPath} />
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              required
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-full bg-red-700 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
