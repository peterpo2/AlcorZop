import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { getAdminPath } from '@/lib/adminPath';
import { createSessionToken, getSessionCookieOptions, SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isSafeRedirect = (value: string) => value.startsWith('/') && !value.startsWith('//');

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limit = rateLimit(`login:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many login attempts.' }, { status: 429 });
  }

  const contentType = request.headers.get('content-type') || '';
  const wantsJson = request.headers.get('accept')?.includes('application/json');
  let email = '';
  let password = '';
  let redirectTo = '';

  if (contentType.includes('application/json')) {
    const body = await request.json();
    email = String(body.email || '').trim().toLowerCase();
    password = String(body.password || '');
    redirectTo = String(body.redirectTo || '');
  } else {
    const form = await request.formData();
    email = String(form.get('email') || '').trim().toLowerCase();
    password = String(form.get('password') || '');
    redirectTo = String(form.get('redirectTo') || '');
  }

  const fail = () => {
    if (wantsJson) {
      return NextResponse.json({ error: 'Invalid credentials.' }, { status: 401 });
    }
    const url = new URL(`${getAdminPath()}/login`, request.url);
    url.searchParams.set('error', 'invalid');
    return NextResponse.redirect(url, { status: 303 });
  };

  if (!email || !password) {
    return fail();
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin) {
    return fail();
  }

  const matches = await bcrypt.compare(password, admin.passwordHash);
  if (!matches) {
    return fail();
  }

  const token = await createSessionToken({ sub: String(admin.id), email: admin.email });
  const response = NextResponse.redirect(
    new URL(isSafeRedirect(redirectTo) ? redirectTo : getAdminPath(), request.url),
    { status: 303 }
  );
  response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());
  return response;
}
