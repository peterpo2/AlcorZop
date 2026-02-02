'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { MenuPage } from '@/types/content';

export const TopNav = ({ pages }: { pages: MenuPage[] }) => {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm">
      <Link
        href="/"
        className={`rounded-full px-3 py-1 font-medium transition ${
          pathname === '/' ? 'bg-red-700 text-white' : 'bg-white/70 text-neutral-700 hover:bg-white'
        }`}
      >
        Home
      </Link>
      {pages.map((page) => {
        const href = `/p/${page.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={page.id}
            href={href}
            className={`rounded-full px-3 py-1 font-medium transition ${
              active ? 'bg-red-700 text-white' : 'bg-white/70 text-neutral-700 hover:bg-white'
            }`}
          >
            {page.title}
          </Link>
        );
      })}
      <Link
        href="/search"
        className={`rounded-full px-3 py-1 font-medium transition ${
          pathname === '/search' ? 'bg-red-700 text-white' : 'bg-white/70 text-neutral-700 hover:bg-white'
        }`}
      >
        Search
      </Link>
    </nav>
  );
};
