import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAdminPath } from '@/lib/adminPath';
import { SESSION_COOKIE, getSessionByToken } from '@/lib/session';

export const requireAdminSession = async () => {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await getSessionByToken(cookie);
  if (!session) {
    redirect(`${getAdminPath()}/login`);
  }
  return session;
};
