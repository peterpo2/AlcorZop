'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { requireAdminSession } from '@/lib/adminAuth';
import { getAdminPath } from '@/lib/adminPath';
import { getAdminErrorKey, withAdminError } from '@/lib/adminErrors';

const parseOrder = (value: FormDataEntryValue | null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const redirectTo = (topicId?: number, errorKey?: Parameters<typeof withAdminError>[1]) => {
  const adminPath = getAdminPath();
  if (!topicId || !Number.isFinite(topicId)) {
    redirect(withAdminError(`${adminPath}/pages`, errorKey ?? 'invalid'));
  }
  redirect(withAdminError(`${adminPath}/topics/${topicId}/subtopics`, errorKey));
};

export const createSubtopic = async (formData: FormData) => {
  await requireAdminSession();
  const topicId = Number(formData.get('topicId'));
  const title = String(formData.get('title') || '').trim();
  if (!topicId || !title) {
    redirectTo(topicId, 'missing');
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  try {
    await prisma.subtopic.create({
      data: {
        title,
        slug,
        order,
        topic: { connect: { id: topicId } },
      },
    });
  } catch (error) {
    redirectTo(topicId, getAdminErrorKey(error));
  }

  redirectTo(topicId);
};

export const updateSubtopic = async (formData: FormData) => {
  await requireAdminSession();
  const topicId = Number(formData.get('topicId'));
  const subtopicId = Number(formData.get('subtopicId'));
  const title = String(formData.get('title') || '').trim();
  if (!topicId || !subtopicId || !title) {
    redirectTo(topicId, 'missing');
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  try {
    await prisma.subtopic.update({
      where: { id: subtopicId },
      data: { title, slug, order },
    });
  } catch (error) {
    redirectTo(topicId, getAdminErrorKey(error));
  }

  redirectTo(topicId);
};

export const deleteSubtopic = async (formData: FormData) => {
  await requireAdminSession();
  const topicId = Number(formData.get('topicId'));
  const subtopicId = Number(formData.get('subtopicId'));
  if (!topicId || !subtopicId) {
    redirectTo(topicId, 'missing');
  }

  try {
    await prisma.subtopic.delete({ where: { id: subtopicId } });
  } catch (error) {
    redirectTo(topicId, getAdminErrorKey(error));
  }
  redirectTo(topicId);
};
