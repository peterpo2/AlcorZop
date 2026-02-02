import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDocumentBySlug } from '@/lib/content';
import { PdfViewer } from '@/components/PdfViewer';

export const dynamic = 'force-dynamic';

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export default async function DocumentPage({ params }: { params: { docSlug: string } }) {
  const document = await getDocumentBySlug(params.docSlug);
  if (!document) {
    notFound();
  }

  const fileUrl = `/doc/${document.slug}/file`;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-neutral-200 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Document</p>
            <h2 className="text-3xl font-semibold text-neutral-900">{document.title}</h2>
            <p className="mt-2 text-sm text-neutral-500">
              {document.subtopic?.topic?.page?.title ?? 'Page'}
              {document.subtopic?.topic?.title ? ` > ${document.subtopic.topic.title}` : ''}
              {document.subtopic?.title ? ` > ${document.subtopic.title}` : ''}
            </p>
          </div>
          <Link
            href="/search"
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-700"
          >
            Back to Search
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-neutral-600">
          <span>{document.fileName}</span>
          <span>{formatBytes(document.sizeBytes)}</span>
        </div>
        <a
          href={fileUrl}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red-700 underline underline-offset-4"
        >
          Download file
        </a>
      </div>

      <PdfViewer src={fileUrl} title={document.title} />
    </div>
  );
}
