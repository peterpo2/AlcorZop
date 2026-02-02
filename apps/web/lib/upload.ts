import fs from 'fs/promises';
import path from 'path';

export const getUploadDir = () => {
  const dir = process.env.UPLOAD_DIR || '/data/uploads';
  return path.resolve(dir);
};

export const ensureUploadDir = async () => {
  const dir = getUploadDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
};

export const resolveUploadPath = (filePath: string) => {
  const uploadDir = getUploadDir();
  const resolved = path.resolve(uploadDir, filePath);
  if (resolved !== uploadDir && !resolved.startsWith(`${uploadDir}${path.sep}`)) {
    throw new Error('Invalid file path.');
  }
  return resolved;
};
