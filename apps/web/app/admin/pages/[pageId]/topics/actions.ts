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

const redirectTo = (pageId?: number, errorKey?: Parameters<typeof withAdminError>[1]) => {
  const adminPath = getAdminPath();
  if (!pageId || !Number.isFinite(pageId)) {
    redirect(withAdminError(`${adminPath}/pages`, errorKey ?? 'invalid'));
  }
  redirect(withAdminError(`${adminPath}/pages/${pageId}/topics`, errorKey));
};

export const createTopic = async (formData: FormData) => {
  await requireAdminSession();
  const pageId = Number(formData.get('pageId'));
  const title = String(formData.get('title') || '').trim();
  if (!pageId || !title) {
    redirectTo(pageId, 'missing');
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  try {
    await prisma.topic.create({
      data: {
        title,
        slug,
        order,
        page: { connect: { id: pageId } },
      },
    });
  } catch (error) {
    redirectTo(pageId, getAdminErrorKey(error));
  }

  redirectTo(pageId);
};

export const updateTopic = async (formData: FormData) => {
  await requireAdminSession();
  const pageId = Number(formData.get('pageId'));
  const topicId = Number(formData.get('topicId'));
  const title = String(formData.get('title') || '').trim();
  if (!pageId || !topicId || !title) {
    redirectTo(pageId, 'missing');
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  try {
    await prisma.topic.update({
      where: { id: topicId },
      data: { title, slug, order },
    });
  } catch (error) {
    redirectTo(pageId, getAdminErrorKey(error));
  }

  redirectTo(pageId);
};

export const deleteTopic = async (formData: FormData) => {
  await requireAdminSession();
  const pageId = Number(formData.get('pageId'));
  const topicId = Number(formData.get('topicId'));
  if (!pageId || !topicId) {
    redirectTo(pageId, 'missing');
  }

  try {
    await prisma.topic.delete({ where: { id: topicId } });
  } catch (error) {
    redirectTo(pageId, getAdminErrorKey(error));
  }
  redirectTo(pageId);
};
