import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminPath } from '@/lib/adminPath';
import { SESSION_COOKIE, getSessionByToken } from '@/lib/session';

export const requireAdminSession = async () => {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  const session = await getSessionByToken(cookie);
  if (!session) {
    redirect(`${getAdminPath()}/login`);
  }
  return session;
};
