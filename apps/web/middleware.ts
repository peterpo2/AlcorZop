import { NextResponse, type NextRequest } from 'next/server';
import { getAdminPath, isAdminPath } from '@/lib/adminPath';

const isStaticAsset = (pathname: string) =>
  pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const adminPath = getAdminPath();
  const matchesAdminPath = isAdminPath(pathname, adminPath);
  const isAdminApi = pathname.startsWith('/api/admin');
  const loginPath = `${adminPath}/login`;
  const isAuthCheckRoute = pathname === '/api/admin/auth/check';
  const isLoginPage = pathname === loginPath;
  const requestHeaders = new Headers(request.headers);
  if (matchesAdminPath) {
    requestHeaders.set('x-admin-route', '1');
  }
  if (isLoginPage) {
    requestHeaders.set('x-admin-login', '1');
  }

  if (adminPath !== '/admin' && pathname.startsWith('/admin')) {
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  if (!matchesAdminPath && !isAdminApi) {
    return NextResponse.next();
  }

  const isLoginRoute = pathname === loginPath || pathname === '/api/admin/login';

  if (!isLoginRoute && !isAuthCheckRoute) {
    const authUrl = new URL('/api/admin/auth/check', request.url);
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    if (authResponse.status === 401) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = loginPath;
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (matchesAdminPath && adminPath !== '/admin') {
    const rewritten = request.nextUrl.clone();
    rewritten.pathname = pathname.replace(adminPath, '/admin');
    return NextResponse.rewrite(rewritten, { request: { headers: requestHeaders } });
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
