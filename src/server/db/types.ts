// Content types for the Content Management API

export interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[] | null;
  embedding: number[] | null;
  status: 'draft' | 'published' | 'archived';
  created_at: Date;
  updated_at: Date;
}

export interface ArticleCreateInput {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface ArticleUpdateInput {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived';
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  embedding: number[] | null;
  created_at: Date;
}

export interface FAQCreateInput {
  question: string;
  answer: string;
  category: string;
  sort_order?: number;
}

export interface FAQUpdateInput {
  question?: string;
  answer?: string;
  category?: string;
  sort_order?: number;
}

export interface Video {
  id: number;
  title: string;
  url: string;
  summary: string | null;
  key_topics: string[] | null;
  timestamps: VideoTimestamp[] | null;
  category: string;
  duration_seconds: number | null;
  embedding: number[] | null;
  analysis_status: 'pending' | 'processing' | 'done' | 'failed';
  created_at: Date;
}

export interface VideoTimestamp {
  time: string;
  topic: string;
}

export interface VideoCreateInput {
  title: string;
  url: string;
  category: string;
  duration_seconds?: number;
}

export interface VideoUpdateInput {
  title?: string;
  url?: string;
  category?: string;
  duration_seconds?: number;
  summary?: string;
  key_topics?: (string | null)[] | null;
  timestamps?: (Record<string, unknown> | null) | null;
  analysis_status?: 'pending' | 'processing' | 'done' | 'failed';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: string;
}
