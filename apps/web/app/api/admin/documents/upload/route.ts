import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slugify';
import { ensureUploadDir } from '@/lib/upload';
import { SESSION_COOKIE, getSessionByToken } from '@/lib/session';

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
  const file = form.get('file');
  const title = String(form.get('title') || '').trim();
  const slugInput = String(form.get('slug') || '').trim();
  const returnTo = String(form.get('returnTo') || '').trim();
  const subtopicId = Number(form.get('subtopicId'));

  if (!subtopicId) {
    return NextResponse.json({ error: 'Subtopic is required.' }, { status: 400 });
  }

  const subtopic = await prisma.subtopic.findUnique({ where: { id: subtopicId } });
  if (!subtopic) {
    return NextResponse.json({ error: 'Subtopic not found.' }, { status: 404 });
  }

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'File is required.' }, { status: 400 });
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files are allowed.' }, { status: 400 });
  }

  const maxUploadMb = Number(process.env.MAX_UPLOAD_MB || 20);
  const safeMaxUploadMb = Number.isFinite(maxUploadMb) ? maxUploadMb : 20;
  const maxBytes = Math.max(safeMaxUploadMb, 1) * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json({ error: `File is too large. Max ${safeMaxUploadMb} MB.` }, { status: 400 });
  }

  const baseTitle = title || file.name.replace(/\.pdf$/i, '');
  const baseSlug = slugify(slugInput || baseTitle) || crypto.randomUUID();

  const existing = await prisma.document.findUnique({ where: { slug: baseSlug } });
  const slug = existing ? `${baseSlug}-${crypto.randomUUID().slice(0, 6)}` : baseSlug;

  const uploadDir = await ensureUploadDir();
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
  } catch (error) {
    await fs.unlink(filePath).catch(() => undefined);
    throw error;
  }

  if (returnTo && isSafeRedirect(returnTo)) {
    return NextResponse.redirect(new URL(returnTo, request.url), { status: 303 });
  }

  return NextResponse.json({ ok: true, slug });
}
