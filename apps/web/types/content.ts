export type MenuPage = {
  id: number;
  title: string;
  slug: string;
  order: number;
};

export type DocumentItem = {
  id: number;
  title: string;
  slug: string;
};

export type SubtopicItem = {
  id: number;
  title: string;
  slug: string;
  order: number;
  documents: DocumentItem[];
};

export type TopicItem = {
  id: number;
  title: string;
  slug: string;
  order: number;
  subtopics: SubtopicItem[];
};

export type PageItem = {
  id: number;
  title: string;
  slug: string;
  order: number;
  topics: TopicItem[];
};

export type DocumentDetail = {
  id: number;
  title: string;
  slug: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  subtopic: {
    id: number;
    title: string;
    slug: string;
    topic: {
      id: number;
      title: string;
      slug: string;
      page: {
        id: number;
        title: string;
        slug: string;
      };
    };
  } | null;
};

export type SearchResult = {
  id: number;
  title: string;
  slug: string;
  path: {
    page: { title: string; slug: string } | null;
    topic: { title: string; slug: string } | null;
    subtopic: { title: string; slug: string } | null;
  };
};
