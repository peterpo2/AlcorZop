'use server';

import crypto from 'crypto';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { requireAdminSession } from '@/lib/adminAuth';
import { getAdminPath } from '@/lib/adminPath';

const parseOrder = (value: FormDataEntryValue | null) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const redirectTo = (topicId?: number) => {
  const adminPath = getAdminPath();
  if (!topicId || !Number.isFinite(topicId)) {
    redirect(`${adminPath}/pages`);
  }
  redirect(`${adminPath}/topics/${topicId}/subtopics`);
};

export const createSubtopic = async (formData: FormData) => {
  await requireAdminSession();
  const topicId = Number(formData.get('topicId'));
  const title = String(formData.get('title') || '').trim();
  if (!topicId || !title) {
    redirectTo(topicId);
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  await prisma.subtopic.create({
    data: {
      title,
      slug,
      order,
      topic: { connect: { id: topicId } },
    },
  });

  redirectTo(topicId);
};

export const updateSubtopic = async (formData: FormData) => {
  await requireAdminSession();
  const topicId = Number(formData.get('topicId'));
  const subtopicId = Number(formData.get('subtopicId'));
  const title = String(formData.get('title') || '').trim();
  if (!topicId || !subtopicId || !title) {
    redirectTo(topicId);
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  await prisma.subtopic.update({
    where: { id: subtopicId },
    data: { title, slug, order },
  });

  redirectTo(topicId);
};

export const deleteSubtopic = async (formData: FormData) => {
  await requireAdminSession();
  const topicId = Number(formData.get('topicId'));
  const subtopicId = Number(formData.get('subtopicId'));
  if (!topicId || !subtopicId) {
    redirectTo(topicId);
  }

  await prisma.subtopic.delete({ where: { id: subtopicId } });
  redirectTo(topicId);
};
