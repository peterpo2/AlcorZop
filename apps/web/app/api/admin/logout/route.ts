import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminPath } from '@/lib/adminPath';
import { SESSION_COOKIE, deleteSessionByToken, getSessionCookieOptions } from '@/lib/session';
import { getRequestOrigin, isSecureRequest } from '@/lib/requestOrigin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  await deleteSessionByToken(token);
  const response = NextResponse.redirect(new URL(`${getAdminPath()}/login`, getRequestOrigin(request)), {
    status: 303,
  });
  response.cookies.set(SESSION_COOKIE, '', { ...getSessionCookieOptions(isSecureRequest(request)), maxAge: 0 });
  return response;
}
