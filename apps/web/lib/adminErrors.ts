import { Prisma } from '@prisma/client';

export type AdminErrorKey = 'missing' | 'duplicate' | 'db' | 'upload' | 'invalid';

const adminErrorMessages: Record<AdminErrorKey, string> = {
  missing: 'Please fill out all required fields before submitting.',
  duplicate: 'That slug is already in use. Please choose a different one.',
  db: 'Something went wrong while saving your changes. Please try again.',
  upload: 'Upload failed. Please try again.',
  invalid: 'The request could not be processed. Please try again.',
};

export const getAdminErrorMessage = (key?: string) =>
  key && key in adminErrorMessages ? adminErrorMessages[key as AdminErrorKey] : '';

export const getAdminErrorKey = (error: unknown): AdminErrorKey => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return 'duplicate';
    }
    return 'db';
  }
  return 'db';
};

export const withAdminError = (path: string, key?: AdminErrorKey, detail?: string) => {
  if (!key) {
    return path;
  }
  const separator = path.includes('?') ? '&' : '?';
  const detailParam = detail ? `&detail=${encodeURIComponent(detail)}` : '';
  return `${path}${separator}error=${encodeURIComponent(key)}${detailParam}`;
};
