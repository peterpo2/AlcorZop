import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminPath } from '@/lib/adminPath';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export const requireAdminSession = async () => {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  const session = cookie ? await verifySessionToken(cookie) : null;
  if (!session) {
    redirect(`${getAdminPath()}/login`);
  }
  return session;
};
