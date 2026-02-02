'use client';

import { useMemo, useState } from 'react';
import type { PageItem, SubtopicItem, TopicItem } from '@/types/strapi';
import { RichTextRenderer } from '@/components/RichTextRenderer';
import Link from 'next/link';

const blocksToText = (blocks?: SubtopicItem['content']) => {
  if (!blocks) return '';
  if (typeof blocks === 'string') return blocks;
  return blocks
    .map((block) =>
      (block.children || [])
        .map((child) => (typeof child.text === 'string' ? child.text : ''))
        .join('')
    )
    .join(' ');
};

const filterSubtopics = (subtopics: SubtopicItem[], query: string) => {
  if (!query) return subtopics;
  const q = query.toLowerCase();
  return subtopics
    .map((subtopic) => {
      const contentText = blocksToText(subtopic.content).toLowerCase();
      const titleMatch = subtopic.title.toLowerCase().includes(q);
      const contentMatch = contentText.includes(q);
      const matchedDocuments = subtopic.documents.filter((doc) => doc.title.toLowerCase().includes(q));
      if (titleMatch || contentMatch || matchedDocuments.length > 0) {
        return {
          ...subtopic,
          documents: matchedDocuments.length > 0 ? matchedDocuments : subtopic.documents,
        };
      }
      return null;
    })
    .filter(Boolean) as SubtopicItem[];
};

const filterTopics = (topics: TopicItem[], query: string) => {
  if (!query) return topics;
  return topics
    .map((topic) => {
      const subtopics = filterSubtopics(topic.subtopics, query);
      if (subtopics.length === 0) return null;
      return { ...topic, subtopics };
    })
    .filter(Boolean) as TopicItem[];
};

export const PageAccordion = ({ page }: { page: PageItem }) => {
  const [openTopicId, setOpenTopicId] = useState<number | null>(page.topics[0]?.id ?? null);
  const [query, setQuery] = useState('');

  const filteredTopics = useMemo(() => filterTopics(page.topics, query), [page.topics, query]);
  const isSearching = query.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-100 bg-white/80 p-4 shadow-sm backdrop-blur">
        <label className="text-sm font-medium text-neutral-700" htmlFor="search-in-page">
          Filter within this page
        </label>
        <input
          id="search-in-page"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search subtopics or document titles"
          className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm focus:border-red-300 focus:outline-none focus:ring-2 focus:ring-red-200"
        />
        <p className="mt-2 text-xs text-neutral-500">
          Try searching by subtopic title, content keywords, or document name.
        </p>
      </div>

      <div className="space-y-4">
        {filteredTopics.map((topic) => {
          const isOpen = isSearching || openTopicId === topic.id;
          return (
            <div key={topic.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <button
                type="button"
                className="flex w-full items-center justify-between bg-red-700 px-5 py-4 text-left text-white"
                onClick={() => setOpenTopicId((prev) => (prev === topic.id ? null : topic.id))}
                aria-expanded={isOpen}
              >
                <span className="text-base font-semibold">{topic.title}</span>
                <span className="text-sm opacity-80">{isOpen ? 'Hide' : 'View'}</span>
              </button>

              {isOpen ? (
                <div className="space-y-6 p-5">
                  {topic.subtopics.map((subtopic) => (
                    <div key={subtopic.id} className="rounded-xl border border-neutral-100 bg-neutral-50/60 p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-lg font-semibold text-neutral-900">{subtopic.title}</h3>
                        <div className="text-xs text-neutral-500">
                          {subtopic.internalNumber ? <span>Internal {subtopic.internalNumber}</span> : null}
                          {subtopic.internalNumber && subtopic.aopNumber ? ' • ' : null}
                          {subtopic.aopNumber ? <span>AOP {subtopic.aopNumber}</span> : null}
                          {(subtopic.internalNumber || subtopic.aopNumber) && subtopic.startDate ? ' • ' : null}
                          {subtopic.startDate ? <span>Start {subtopic.startDate}</span> : null}
                        </div>
                      </div>
                      <div className="mt-2 text-sm">
                        <RichTextRenderer content={subtopic.content} />
                      </div>
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Documents</p>
                        {subtopic.documents.length > 0 ? (
                          <ul className="mt-2 space-y-2">
                            {subtopic.documents.map((doc) => (
                              <li key={doc.id}>
                                <Link
                                  href={`/doc/${doc.slug}`}
                                  className="text-sm font-medium text-red-700 underline-offset-4 hover:underline"
                                >
                                  {doc.title}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-neutral-500">No documents added yet.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}

        {filteredTopics.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/80 p-6 text-center text-sm text-neutral-500">
            No topics match your search yet. Try a different keyword.
          </div>
        ) : null}
      </div>
    </div>
  );
};
