export const normalizeAdminPath = (value?: string | null) => {
  let path = (value ?? '').trim();
  if (!path) path = '/admin';
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
};

export const getAdminPath = () => normalizeAdminPath(process.env.ADMIN_PATH);

export const isAdminPath = (pathname: string, adminPath: string) =>
  pathname === adminPath || pathname.startsWith(`${adminPath}/`);

export const buildAdminHref = (adminPath: string, suffix: string) => {
  if (!suffix) return adminPath;
  if (!suffix.startsWith('/')) suffix = `/${suffix}`;
  if (adminPath === '/') return suffix;
  return `${adminPath}${suffix}`;
};
