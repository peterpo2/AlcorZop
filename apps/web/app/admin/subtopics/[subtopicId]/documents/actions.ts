'use server';

import fs from 'fs/promises';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/adminAuth';
import { getAdminPath } from '@/lib/adminPath';
import { resolveUploadPath } from '@/lib/upload';
import { getAdminErrorKey, withAdminError } from '@/lib/adminErrors';

const redirectTo = (subtopicId?: number, errorKey?: Parameters<typeof withAdminError>[1]) => {
  const adminPath = getAdminPath();
  if (!subtopicId || !Number.isFinite(subtopicId)) {
    redirect(withAdminError(`${adminPath}/pages`, errorKey ?? 'invalid'));
  }
  redirect(withAdminError(`${adminPath}/subtopics/${subtopicId}/documents`, errorKey));
};

export const deleteDocument = async (formData: FormData) => {
  await requireAdminSession();
  const subtopicId = Number(formData.get('subtopicId'));
  const documentId = Number(formData.get('documentId'));
  if (!subtopicId || !documentId) {
    redirectTo(subtopicId, 'missing');
  }

  try {
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    if (document) {
      await prisma.document.delete({ where: { id: documentId } });
      try {
        const filePath = resolveUploadPath(document.filePath);
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore missing file; database entry is the source of truth.
      }
    }
  } catch (error) {
    redirectTo(subtopicId, getAdminErrorKey(error));
  }

  redirectTo(subtopicId);
};
