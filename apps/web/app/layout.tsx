import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { IBM_Plex_Sans, Newsreader } from 'next/font/google';
import Link from 'next/link';
import './globals.css';
import { getMenuPages } from '@/lib/content';
import { TopNav } from '@/components/TopNav';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
});

const serif = Newsreader({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Document Portal',
  description: 'Browse official pages, topics, and documents.',
};

export const dynamic = 'force-dynamic';

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const pages = await getMenuPages().catch(() => []);
  const requestHeaders = await headers();
  const isAdminRoute = requestHeaders.get('x-admin-route') === '1';

  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} min-h-screen bg-[var(--portal-bg)] text-[var(--portal-ink)]`}>
        {!isAdminRoute ? (
          <header className="border-b border-red-900/10 bg-red-700 text-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-red-100">Document Portal</p>
                <h1 className="font-serif text-2xl font-semibold">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 transition hover:bg-white/20"
                  >
                    AlcorZop Knowledge Library
                  </Link>
                </h1>
              </div>
              <TopNav pages={pages} />
            </div>
          </header>
        ) : null}
        <main className={`mx-auto max-w-6xl px-6 ${isAdminRoute ? 'py-8' : 'py-10'}`}>{children}</main>
        {!isAdminRoute ? (
          <footer className="border-t border-neutral-200 bg-white/70 px-6 py-8 text-sm text-neutral-500">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
              <span>Managed in the custom admin portal.</span>
              <span>(c) 2026 AlcorZop</span>
            </div>
          </footer>
        ) : null}
      </body>
    </html>
  );
}
