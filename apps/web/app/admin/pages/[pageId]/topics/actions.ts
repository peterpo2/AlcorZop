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

const redirectTo = (pageId?: number) => {
  const adminPath = getAdminPath();
  if (!pageId || !Number.isFinite(pageId)) {
    redirect(`${adminPath}/pages`);
  }
  redirect(`${adminPath}/pages/${pageId}/topics`);
};

export const createTopic = async (formData: FormData) => {
  await requireAdminSession();
  const pageId = Number(formData.get('pageId'));
  const title = String(formData.get('title') || '').trim();
  if (!pageId || !title) {
    redirectTo(pageId);
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  await prisma.topic.create({
    data: {
      title,
      slug,
      order,
      page: { connect: { id: pageId } },
    },
  });

  redirectTo(pageId);
};

export const updateTopic = async (formData: FormData) => {
  await requireAdminSession();
  const pageId = Number(formData.get('pageId'));
  const topicId = Number(formData.get('topicId'));
  const title = String(formData.get('title') || '').trim();
  if (!pageId || !topicId || !title) {
    redirectTo(pageId);
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  await prisma.topic.update({
    where: { id: topicId },
    data: { title, slug, order },
  });

  redirectTo(pageId);
};

export const deleteTopic = async (formData: FormData) => {
  await requireAdminSession();
  const pageId = Number(formData.get('pageId'));
  const topicId = Number(formData.get('topicId'));
  if (!pageId || !topicId) {
    redirectTo(pageId);
  }

  await prisma.topic.delete({ where: { id: topicId } });
  redirectTo(pageId);
};
