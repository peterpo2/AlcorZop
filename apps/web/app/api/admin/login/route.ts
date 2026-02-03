import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rateLimit';
import { getAdminPath } from '@/lib/adminPath';
import { createSession, getSessionCookieOptions, SESSION_COOKIE } from '@/lib/session';
import { getRequestOrigin, isSecureRequest } from '@/lib/requestOrigin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isSafeRedirect = (value: string) => value.startsWith('/') && !value.startsWith('//');

const getRequestBody = async (request: Request) => {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}));
    return {
      email: String(body.email || '').trim().toLowerCase(),
      password: String(body.password || ''),
      redirectTo: String(body.redirectTo || ''),
      wantsJson: true,
    };
  }

  const form = await request.formData();
  return {
    email: String(form.get('email') || '').trim().toLowerCase(),
    password: String(form.get('password') || ''),
    redirectTo: String(form.get('redirectTo') || ''),
    wantsJson: request.headers.get('accept')?.includes('application/json') || false,
  };
};

const ensureAdminBootstrap = async (email: string, password: string) => {
  const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || '';
  const envPassword = process.env.ADMIN_PASSWORD || '';
  if (!envEmail || !envPassword) return null;
  if (email !== envEmail || password !== envPassword) return null;

  const existing = await prisma.adminUser.findUnique({ where: { email: envEmail } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(envPassword, 12);
  return prisma.adminUser.create({ data: { email: envEmail, passwordHash } });
};

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipLimit = rateLimit(`login:ip:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 });
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'Too many login attempts.' }, { status: 429 });
    }

    const { email, password, redirectTo, wantsJson } = await getRequestBody(request);

    const fail = (reason: 'invalid' | 'rate' | 'server' = 'invalid') => {
      if (wantsJson) {
        const status = reason === 'rate' ? 429 : reason === 'server' ? 500 : 401;
        return NextResponse.json(
          { error: reason === 'rate' ? 'Too many login attempts.' : 'Invalid credentials.' },
          { status }
        );
      }
      const url = new URL(`${getAdminPath()}/login`, getRequestOrigin(request));
      url.searchParams.set('error', reason);
      return NextResponse.redirect(url, { status: 303 });
    };

    if (!email || !password) {
      return fail('invalid');
    }

    const emailLimit = rateLimit(`login:email:${email}`, { windowMs: 15 * 60 * 1000, max: 5 });
    if (!emailLimit.allowed) {
      return fail('rate');
    }

    let admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      admin = await ensureAdminBootstrap(email, password);
    }
    if (!admin) {
      return fail('invalid');
    }

    const matches = await bcrypt.compare(password, admin.passwordHash);
    if (!matches) {
      return fail('invalid');
    }

    const token = await createSession(admin.id);
    const response = NextResponse.redirect(
      new URL(isSafeRedirect(redirectTo) ? redirectTo : getAdminPath(), getRequestOrigin(request)),
      { status: 303 }
    );
    response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions(isSecureRequest(request)));
    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    const wantsJson = request.headers.get('accept')?.includes('application/json');
    if (wantsJson) {
      return NextResponse.json({ error: 'Login failed.' }, { status: 500 });
    }
    const url = new URL(`${getAdminPath()}/login`, getRequestOrigin(request));
    url.searchParams.set('error', 'server');
    return NextResponse.redirect(url, { status: 303 });
  }
}
