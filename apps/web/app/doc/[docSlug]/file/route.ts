import fs from 'fs';
import { NextResponse } from 'next/server';
import { getDocumentBySlug } from '@/lib/content';
import { resolveUploadPath } from '@/lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const sanitizeFileName = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, '_');

export async function GET(
  _request: Request,
  { params }: { params: { docSlug: string } }
) {
  const document = await getDocumentBySlug(params.docSlug);
  if (!document) {
    return new NextResponse('Not found', { status: 404 });
  }

  let filePath: string;
  try {
    filePath = resolveUploadPath(document.filePath);
  } catch (error) {
    return new NextResponse('Not found', { status: 404 });
  }

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);
  const filename = sanitizeFileName(document.fileName || `${document.slug}.pdf`);

  return new NextResponse(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': document.mimeType || 'application/pdf',
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
