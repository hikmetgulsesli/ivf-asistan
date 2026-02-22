export type ArticleStatus = 'draft' | 'published' | 'archived';

export type VideoAnalysisStatus = 'pending' | 'processing' | 'done' | 'failed';

export type ConversationRole = 'user' | 'assistant';

export type Sentiment = 'calm' | 'anxious' | 'fearful' | 'hopeful';

export interface Source {
  type: 'article' | 'faq' | 'video';
  id: number;
  title: string;
}

export interface VideoTimestamp {
  time: string;
  topic: string;
}
