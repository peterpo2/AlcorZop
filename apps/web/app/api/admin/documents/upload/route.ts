import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { ensureUploadDir } from '@/lib/upload';
import { SESSION_COOKIE, getSessionByToken } from '@/lib/session';
import { getRequestOrigin } from '@/lib/requestOrigin';
import { withAdminError } from '@/lib/adminErrors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const isSafeRedirect = (value: string) => value.startsWith('/') && !value.startsWith('//');

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await getSessionByToken(token);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await request.formData();
  const rawFiles = form.getAll('files');
  const fallbackFile = form.get('file');
  const title = String(form.get('title') || '').trim();
  const slugInput = String(form.get('slug') || '').trim();
  const returnTo = String(form.get('returnTo') || '').trim();
  const subtopicId = Number(form.get('subtopicId'));
  const redirectError = (message: string, status: number) => {
    if (returnTo && isSafeRedirect(returnTo)) {
      const url = new URL(withAdminError(returnTo, 'upload', message), getRequestOrigin(request));
      return NextResponse.redirect(url, { status: 303 });
    }
    return NextResponse.json({ error: message }, { status });
  };

  if (!subtopicId) {
    return redirectError('Subtopic is required.', 400);
  }

  const subtopic = await prisma.subtopic.findUnique({ where: { id: subtopicId } });
  if (!subtopic) {
    return redirectError('Subtopic not found.', 404);
  }

  const files = rawFiles.filter((entry): entry is File => entry instanceof File);
  if (files.length === 0 && fallbackFile instanceof File) {
    files.push(fallbackFile);
  }

  if (files.length === 0) {
    return redirectError('File is required.', 400);
  }

  const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 20);
  const safeMaxUploadMb = Number.isFinite(maxUploadMb) ? maxUploadMb : 20;
  const maxBytes = Math.max(safeMaxUploadMb, 1) * 1024 * 1024;

  for (const file of files) {
    if (file.type !== 'application/pdf') {
      return redirectError('Only PDF files are allowed.', 400);
    }
    if (file.size > maxBytes) {
      return redirectError(`File "${file.name}" is too large. Max ${safeMaxUploadMb} MB.`, 400);
    }
  }

  const uploadDir = await ensureUploadDir();
  const createdSlugs: string[] = [];

  for (const file of files) {
    const singleUpload = files.length === 1;
    const baseTitle = (singleUpload ? title : '') || file.name.replace(/\.pdf$/i, '');
    const baseSlug = slugify((singleUpload ? slugInput : '') || baseTitle) || crypto.randomUUID();

    const existing = await prisma.document.findUnique({ where: { slug: baseSlug } });
    const slug = existing ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;

    const storageName = `${slug}-${crypto.randomUUID()}.pdf`;
    const filePath = path.join(uploadDir, storageName);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    try {
      await prisma.document.create({
        data: {
          title: baseTitle,
          slug,
          filePath: storageName,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          subtopic: { connect: { id: subtopicId } },
        },
      });
      createdSlugs.push(slug);
    } catch (error) {
      await fs.unlink(filePath).catch(() => undefined);
      return redirectError('Upload failed while saving metadata.', 500);
    }
  }

  if (returnTo && isSafeRedirect(returnTo)) {
    return NextResponse.redirect(new URL(returnTo, getRequestOrigin(request)), { status: 303 });
  }

  return NextResponse.json({ ok: true, slugs: createdSlugs });
}
