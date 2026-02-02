export type StrapiBlock = {
  type: string;
  children?: StrapiInline[];
  level?: number;
  format?: 'ordered' | 'unordered';
  url?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

export type StrapiInline = {
  type?: string;
  text?: string;
  url?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  children?: StrapiInline[];
};

export type StrapiMediaFile = {
  url: string;
  name?: string;
  mime?: string;
  ext?: string;
  size?: number;
};

export type DocumentItem = {
  id: number;
  title: string;
  slug: string;
  publishedAtCustom?: string | null;
  file?: StrapiMediaFile | null;
};

export type SubtopicItem = {
  id: number;
  title: string;
  slug: string;
  order: number;
  content: StrapiBlock[] | string | null;
  startDate?: string | null;
  internalNumber?: string | null;
  aopNumber?: string | null;
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
  description?: StrapiBlock[] | string | null;
  topics: TopicItem[];
};

export type MenuPage = {
  id: number;
  title: string;
  slug: string;
  order: number;
};

export type SearchResult = {
  id: number;
  title: string;
  slug: string;
  file?: StrapiMediaFile | null;
  path: {
    page?: { title: string; slug: string } | null;
    topic?: { title: string; slug: string } | null;
    subtopic?: { title: string; slug: string } | null;
  };
};
