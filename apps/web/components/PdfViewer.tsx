'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { StrapiMediaFile } from '@/types/strapi';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const useContainerWidth = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(800);

  useEffect(() => {
    if (!ref.current) return;
    const update = () => {
      if (ref.current) {
        setWidth(ref.current.clientWidth);
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
};

export const PdfViewer = ({ file }: { file: StrapiMediaFile }) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const { ref, width } = useContainerWidth();

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  }, []);

  useEffect(() => {
    setPageNumber(1);
  }, [file.url]);

  if (error || isMobile) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="text-sm text-neutral-600">
          PDF preview is limited on this device. Use the embedded viewer below or download the file.
        </p>
        <iframe
          title={file.name || 'PDF document'}
          src={file.url}
          className="mt-4 h-[70vh] w-full rounded-xl border border-neutral-200"
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-600">
        <div>
          Page {pageNumber} of {numPages || '—'}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide disabled:opacity-40"
            onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
          >
            Prev
          </button>
          <button
            type="button"
            className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide disabled:opacity-40"
            onClick={() => setPageNumber((prev) => Math.min(prev + 1, numPages || prev + 1))}
            disabled={numPages === 0 || pageNumber >= numPages}
          >
            Next
          </button>
        </div>
      </div>
      <div ref={ref} className="mt-4">
        <Document
          file={file.url}
          onLoadSuccess={(info) => {
            setNumPages(info.numPages);
            setError(null);
          }}
          onLoadError={(err) => setError(err.message)}
          loading={<p className="text-sm text-neutral-500">Loading PDF…</p>}
        >
          <Page pageNumber={pageNumber} width={Math.min(width, 900)} />
        </Document>
      </div>
    </div>
  );
};
