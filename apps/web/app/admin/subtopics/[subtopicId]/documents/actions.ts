'use server';

import fs from 'fs/promises';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/adminAuth';
import { getAdminPath } from '@/lib/adminPath';
import { resolveUploadPath } from '@/lib/upload';

const redirectTo = (subtopicId?: number) => {
  const adminPath = getAdminPath();
  if (!subtopicId || !Number.isFinite(subtopicId)) {
    redirect(`${adminPath}/pages`);
  }
  redirect(`${adminPath}/subtopics/${subtopicId}/documents`);
};

export const deleteDocument = async (formData: FormData) => {
  await requireAdminSession();
  const subtopicId = Number(formData.get('subtopicId'));
  const documentId = Number(formData.get('documentId'));
  if (!subtopicId || !documentId) {
    redirectTo(subtopicId);
  }

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

  redirectTo(subtopicId);
};
