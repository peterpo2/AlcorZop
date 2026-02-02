import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'alcorzop_session';

const DEFAULT_TTL_DAYS = 7;
const SESSION_REFRESH_SECONDS = 60 * 60 * 24;
const SESSION_TOUCH_SECONDS = 60 * 10;

const getSessionTtlSeconds = () => {
  const days = Number(process.env.SESSION_TTL_DAYS || DEFAULT_TTL_DAYS);
  const safeDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_TTL_DAYS;
  return safeDays * 24 * 60 * 60;
};

const getSessionExpiry = () => new Date(Date.now() + getSessionTtlSeconds() * 1000);

const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const generateToken = () => crypto.randomBytes(32).toString('base64url');

export const createSession = async (userId: number) => {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const now = new Date();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt: getSessionExpiry(),
      lastSeenAt: now,
    },
  });

  return token;
};

export const getSessionByToken = async (token?: string | null) => {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  const shouldTouch = now - session.lastSeenAt.getTime() > SESSION_TOUCH_SECONDS * 1000;
  const shouldRefresh = session.expiresAt.getTime() - now < SESSION_REFRESH_SECONDS * 1000;

  if (shouldTouch || shouldRefresh) {
    await prisma.session.update({
      where: { id: session.id },
      data: {
        lastSeenAt: new Date(now),
        expiresAt: shouldRefresh ? getSessionExpiry() : session.expiresAt,
      },
    });
  }

  return session;
};

export const deleteSessionByToken = async (token?: string | null) => {
  if (!token) return;
  const tokenHash = hashToken(token);
  await prisma.session.delete({ where: { tokenHash } }).catch(() => undefined);
};

export const getSessionCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: getSessionTtlSeconds(),
});
