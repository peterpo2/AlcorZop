import { prisma } from '@/lib/prisma';
import type {
  DocumentDetail,
  MenuPage,
  PageItem,
  SearchResult,
} from '@/types/content';

export const getMenuPages = async (): Promise<MenuPage[]> =>
  prisma.page.findMany({
    orderBy: { order: 'asc' },
    select: { id: true, title: true, slug: true, order: true },
  });

export const getPageBySlug = async (slug: string): Promise<PageItem | null> => {
  const normalized = (slug ?? '').trim();
  if (!normalized) return null;

  const include = {
    topics: {
      orderBy: { order: 'asc' },
      include: {
        subtopics: {
          orderBy: { order: 'asc' },
          include: {
            documents: { orderBy: { title: 'asc' } },
          },
        },
      },
    },
  } as const;

  const bySlug = await prisma.page.findUnique({
    where: { slug: normalized },
    include,
  });
  if (bySlug) return bySlug;

  const numericId = Number(normalized);
  if (!Number.isInteger(numericId) || numericId <= 0 || String(numericId) !== normalized) {
    return null;
  }

  return prisma.page.findUnique({
    where: { id: numericId },
    include,
  });
};

export const getDocumentBySlug = async (slug: string): Promise<DocumentDetail | null> =>
  prisma.document.findUnique({
    where: { slug },
    include: {
      subtopic: {
        include: {
          topic: {
            include: { page: true },
          },
        },
      },
    },
  });

export const searchDocuments = async (query: string): Promise<SearchResult[]> => {
  const results = await prisma.document.findMany({
    where: {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { subtopic: { title: { contains: query, mode: 'insensitive' } } },
        { subtopic: { topic: { title: { contains: query, mode: 'insensitive' } } } },
        { subtopic: { topic: { page: { title: { contains: query, mode: 'insensitive' } } } } },
      ],
    },
    include: {
      subtopic: {
        include: {
          topic: {
            include: {
              page: true,
            },
          },
        },
      },
    },
    orderBy: { title: 'asc' },
  });

  return results.map(
    (doc: {
      id: number;
      title: string;
      slug: string;
      subtopic: {
        title: string;
        slug: string;
        topic?: {
          title: string;
          slug: string;
          page?: { title: string; slug: string } | null;
        } | null;
      } | null;
    }) => ({
    id: doc.id,
    title: doc.title,
    slug: doc.slug,
    path: {
      page: doc.subtopic?.topic?.page
        ? { title: doc.subtopic.topic.page.title, slug: doc.subtopic.topic.page.slug }
        : null,
      topic: doc.subtopic?.topic
        ? { title: doc.subtopic.topic.title, slug: doc.subtopic.topic.slug }
        : null,
      subtopic: doc.subtopic
        ? { title: doc.subtopic.title, slug: doc.subtopic.slug }
        : null,
    },
    })
  );
};
