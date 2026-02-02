import type {
  DocumentItem,
  MenuPage,
  PageItem,
  SearchResult,
  StrapiMediaFile,
  SubtopicItem,
  TopicItem,
} from '@/types/strapi';

const STRAPI_URL =
  process.env.WEB_STRAPI_URL || process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337';
const API_BASE = `${STRAPI_URL}/api`;

const withBaseUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${STRAPI_URL}${url}`;
};

const normalizeFile = (file?: { url?: string; name?: string; mime?: string; ext?: string; size?: number } | null) => {
  if (!file?.url) return null;
  return {
    url: withBaseUrl(file.url),
    name: file.name,
    mime: file.mime,
    ext: file.ext,
    size: file.size,
  } as StrapiMediaFile;
};

const strapiFetch = async <T>(path: string): Promise<T> => {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Strapi request failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
};

export const getMenuPages = async (): Promise<MenuPage[]> => {
  const data = await strapiFetch<{ data: { id: number; attributes: MenuPage }[] }>(
    '/pages?sort=order:asc&fields[0]=title&fields[1]=slug&fields[2]=order'
  );

  return data.data.map((item) => ({
    id: item.id,
    ...item.attributes,
  }));
};

export const getPageBySlug = async (slug: string): Promise<PageItem | null> => {
  const path =
    `/pages?filters[slug][$eq]=${encodeURIComponent(slug)}` +
    '&populate[topics][sort]=order:asc' +
    '&populate[topics][populate][subtopics][sort]=order:asc' +
    '&populate[topics][populate][subtopics][populate][documents][sort]=title:asc' +
    '&populate[topics][populate][subtopics][populate][documents][populate]=file';

  const data = await strapiFetch<{ data: { id: number; attributes: any }[] }>(path);
  const entry = data.data[0];
  if (!entry) return null;

  const pageAttributes = entry.attributes;

  const topics: TopicItem[] = (pageAttributes.topics?.data || []).map((topic: any) => {
    const topicAttributes = topic.attributes;
    const subtopics: SubtopicItem[] = (topicAttributes.subtopics?.data || []).map((sub: any) => {
      const subAttributes = sub.attributes;
      const documents: DocumentItem[] = (subAttributes.documents?.data || []).map((doc: any) => {
        const docAttributes = doc.attributes;
        const fileData = docAttributes.file?.data?.attributes;
        return {
          id: doc.id,
          title: docAttributes.title,
          slug: docAttributes.slug,
          publishedAtCustom: docAttributes.publishedAtCustom ?? null,
          file: normalizeFile(fileData),
        };
      });

      return {
        id: sub.id,
        title: subAttributes.title,
        slug: subAttributes.slug,
        order: subAttributes.order ?? 0,
        content: subAttributes.content ?? null,
        startDate: subAttributes.startDate ?? null,
        internalNumber: subAttributes.internalNumber ?? null,
        aopNumber: subAttributes.aopNumber ?? null,
        documents,
      };
    });

    return {
      id: topic.id,
      title: topicAttributes.title,
      slug: topicAttributes.slug,
      order: topicAttributes.order ?? 0,
      subtopics,
    };
  });

  return {
    id: entry.id,
    title: pageAttributes.title,
    slug: pageAttributes.slug,
    order: pageAttributes.order ?? 0,
    description: pageAttributes.description ?? null,
    topics,
  };
};

export const getDocumentBySlug = async (slug: string): Promise<DocumentItem | null> => {
  const data = await strapiFetch<{ data: { id: number; attributes: any }[] }>(
    `/documents?filters[slug][$eq]=${encodeURIComponent(slug)}&populate=file`
  );
  const entry = data.data[0];
  if (!entry) return null;
  const attrs = entry.attributes;
  const fileData = attrs.file?.data?.attributes;

  return {
    id: entry.id,
    title: attrs.title,
    slug: attrs.slug,
    publishedAtCustom: attrs.publishedAtCustom ?? null,
    file: normalizeFile(fileData),
  };
};

export const searchDocuments = async (query: string): Promise<SearchResult[]> => {
  const data = await strapiFetch<{ data: { id: number; attributes: any }[] }>(
    `/documents?filters[title][$containsi]=${encodeURIComponent(query)}` +
      '&populate=file&populate=subtopic&populate[subtopic][populate]=topic&populate[subtopic][populate][topic][populate]=page'
  );

  return data.data.map((doc) => {
    const attrs = doc.attributes;
    const fileData = attrs.file?.data?.attributes;
    const subtopic = attrs.subtopic?.data;
    const topic = subtopic?.attributes?.topic?.data;
    const page = topic?.attributes?.page?.data;

    return {
      id: doc.id,
      title: attrs.title,
      slug: attrs.slug,
      file: normalizeFile(fileData),
      path: {
        subtopic: subtopic
          ? { title: subtopic.attributes.title, slug: subtopic.attributes.slug }
          : null,
        topic: topic ? { title: topic.attributes.title, slug: topic.attributes.slug } : null,
        page: page ? { title: page.attributes.title, slug: page.attributes.slug } : null,
      },
    };
  });
};

export const isPdfFile = (file?: StrapiMediaFile | null) => {
  if (!file?.url) return false;
  if (file.mime) return file.mime === 'application/pdf';
  if (file.ext) return file.ext.toLowerCase() === '.pdf';
  return file.url.toLowerCase().endsWith('.pdf');
};
