import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminPath } from '@/lib/adminPath';
import { SESSION_COOKIE, deleteSessionByToken, getSessionCookieOptions } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const token = cookies().get(SESSION_COOKIE)?.value;
  await deleteSessionByToken(token);
  const response = NextResponse.redirect(new URL(`${getAdminPath()}/login`, request.url), { status: 303 });
  response.cookies.set(SESSION_COOKIE, '', { ...getSessionCookieOptions(), maxAge: 0 });
  return response;
}
