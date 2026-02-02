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

export const createPage = async (formData: FormData) => {
  await requireAdminSession();
  const title = String(formData.get('title') || '').trim();
  if (!title) {
    redirect(`${getAdminPath()}/pages`);
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  await prisma.page.create({
    data: {
      title,
      slug,
      order,
    },
  });

  redirect(`${getAdminPath()}/pages`);
};

export const updatePage = async (formData: FormData) => {
  await requireAdminSession();
  const pageId = Number(formData.get('pageId'));
  const title = String(formData.get('title') || '').trim();
  if (!pageId || !title) {
    redirect(`${getAdminPath()}/pages`);
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  await prisma.page.update({
    where: { id: pageId },
    data: { title, slug, order },
  });

  redirect(`${getAdminPath()}/pages`);
};

export const deletePage = async (formData: FormData) => {
  await requireAdminSession();
  const pageId = Number(formData.get('pageId'));
  if (!pageId) {
    redirect(`${getAdminPath()}/pages`);
  }

  await prisma.page.delete({ where: { id: pageId } });
  redirect(`${getAdminPath()}/pages`);
};
