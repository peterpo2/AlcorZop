import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDocumentBySlug, isPdfFile } from '@/lib/strapi';
import { PdfViewer } from '@/components/PdfViewer';

export default async function DocumentPage({ params }: { params: { docSlug: string } }) {
  const document = await getDocumentBySlug(params.docSlug);
  if (!document) {
    notFound();
  }

  const file = document.file;
  const isPdf = isPdfFile(file);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Document</p>
            <h2 className="text-3xl font-semibold text-neutral-900">{document.title}</h2>
          </div>
          <Link
            href="/search"
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-700"
          >
            Back to Search
          </Link>
        </div>
        {file?.url ? (
          <a
            href={file.url}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-700 underline underline-offset-4"
          >
            Download file
          </a>
        ) : (
          <p className="mt-4 text-sm text-neutral-500">No file has been uploaded yet.</p>
        )}
      </div>

      {file?.url && isPdf ? (
        <PdfViewer file={file} />
      ) : file?.url ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">
          This document is not a PDF. Use the download link to open it.
        </div>
      ) : null}
    </div>
  );
}
