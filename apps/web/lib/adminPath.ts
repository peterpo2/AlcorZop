const DEFAULT_ADMIN_PATH = '/admin';
const RANDOM_PATH_TOKENS = new Set(['random', 'auto', 'rotate']);

export const normalizeAdminPath = (value?: string | null) => {
  let path = (value ?? '').trim();
  if (!path) path = DEFAULT_ADMIN_PATH;
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  return path;
};

const getAdminPathSeed = () => {
  const explicit = process.env.ADMIN_PATH_SEED?.trim();
  if (explicit) return explicit;
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || '';
  const password = process.env.ADMIN_PASSWORD || '';
  if (email || password) return `${email}|${password}`;
  return 'admin-path';
};

const hashSeed = (value: string) => {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  return hash;
};

const buildRandomAdminPath = () => {
  const hash = hashSeed(getAdminPathSeed());
  return normalizeAdminPath(`/admin-${hash.slice(0, 12)}`);
};

const isRandomToken = (value?: string | null) => {
  const token = (value ?? '').trim().toLowerCase();
  return RANDOM_PATH_TOKENS.has(token);
};

export const getAdminPath = () => {
  const raw = process.env.ADMIN_PATH;
  if (isRandomToken(raw)) {
    return buildRandomAdminPath();
  }
  return normalizeAdminPath(raw);
};

export const isAdminPath = (pathname: string, adminPath: string) =>
  pathname === adminPath || pathname.startsWith(`${adminPath}/`);

export const buildAdminHref = (adminPath: string, suffix: string) => {
  if (!suffix) return adminPath;
  if (!suffix.startsWith('/')) suffix = `/${suffix}`;
  if (adminPath === '/') return suffix;
  return `${adminPath}${suffix}`;
};
