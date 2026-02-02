import { NextResponse } from 'next/server';
import { getAdminPath } from '@/lib/adminPath';
import { SESSION_COOKIE, getSessionCookieOptions } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL(`${getAdminPath()}/login`, request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, '', { ...getSessionCookieOptions(), maxAge: 0 });
  return response;
}
