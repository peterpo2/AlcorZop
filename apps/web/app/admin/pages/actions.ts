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

export const createPage = async (formData: FormData) => {
  await requireAdminSession();
  const adminPath = getAdminPath();
  const title = String(formData.get('title') || '').trim();
  if (!title) {
    redirect(withAdminError(`${adminPath}/pages`, 'missing'));
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  try {
    await prisma.page.create({
      data: {
        title,
        slug,
        order,
      },
    });
  } catch (error) {
    redirect(withAdminError(`${adminPath}/pages`, getAdminErrorKey(error)));
  }

  redirect(`${adminPath}/pages`);
};

export const updatePage = async (formData: FormData) => {
  await requireAdminSession();
  const adminPath = getAdminPath();
  const pageId = Number(formData.get('pageId'));
  const title = String(formData.get('title') || '').trim();
  if (!pageId || !title) {
    redirect(withAdminError(`${adminPath}/pages`, 'missing'));
  }
  const slugInput = String(formData.get('slug') || '').trim();
  const slug = slugify(slugInput || title) || crypto.randomUUID();
  const order = parseOrder(formData.get('order'));

  try {
    await prisma.page.update({
      where: { id: pageId },
      data: { title, slug, order },
    });
  } catch (error) {
    redirect(withAdminError(`${adminPath}/pages`, getAdminErrorKey(error)));
  }

  redirect(`${adminPath}/pages`);
};

export const deletePage = async (formData: FormData) => {
  await requireAdminSession();
  const adminPath = getAdminPath();
  const pageId = Number(formData.get('pageId'));
  if (!pageId) {
    redirect(withAdminError(`${adminPath}/pages`, 'missing'));
  }

  try {
    await prisma.page.delete({ where: { id: pageId } });
  } catch (error) {
    redirect(withAdminError(`${adminPath}/pages`, getAdminErrorKey(error)));
  }
  redirect(`${adminPath}/pages`);
};
