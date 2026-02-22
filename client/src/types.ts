export interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: number;
  title: string;
  url: string;
  category: string;
  analysis_status: 'pending' | 'processing' | 'done' | 'error';
  summary?: string;
  timestamps?: { time: string; label: string }[];
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  articles: number;
  faqs: number;
  videos: number;
  conversations: number;
  cache: {
    totalEntries: number;
    totalHits: number;
    hitRate: number;
  };
}

export interface TopQuestion {
  question: string;
  count: number;
}

export interface SentimentData {
  sentiment: string;
  count: number;
  percentage: number;
}

export interface Conversation {
  session_id: string;
  last_activity: string;
  last_sentiment?: string;
}
