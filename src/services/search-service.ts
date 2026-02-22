import { getDb } from '../db/connection.js';
import { generateEmbedding } from './embedding-service.js';
import { cosineSimilarity } from '../utils/similarity.js';

export interface SearchResultItem {
  type: 'article' | 'faq' | 'video';
  id: number;
  title: string;
  content: string;
  category: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface SemanticSearchParams {
  query: string;
  limit?: number;
  category?: string;
}

export interface SemanticSearchResult {
  results: SearchResultItem[];
  query: string;
  total: number;
}

/**
 * Build searchable text from an article
 */
function buildArticleSearchText(article: {
  title: string;
  content: string;
  category: string;
  tags: string[];
}): string {
  const tags = article.tags?.length > 0 ? article.tags.join(' ') : '';
  return `${article.title} ${article.content} ${article.category} ${tags}`.trim();
}

/**
 * Build searchable text from an FAQ
 */
function buildFaqSearchText(faq: {
  question: string;
  answer: string;
  category: string;
}): string {
  return `${faq.question} ${faq.answer} ${faq.category}`.trim();
}

/**
 * Build searchable text from a video
 */
function buildVideoSearchText(video: {
  title: string;
  summary: string | null;
  key_topics: string[];
  category: string;
}): string {
  const topics = video.key_topics?.length > 0 ? video.key_topics.join(' ') : '';
  return `${video.title} ${video.summary || ''} ${topics} ${video.category}`.trim();
}

/**
 * Perform semantic search across articles, FAQs, and videos
 */
export async function semanticSearch(params: SemanticSearchParams): Promise<SemanticSearchResult> {
  const { query, limit = 5, category } = params;
  
  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);
  
  const db = getDb();
  
  // Get all published articles with embeddings
  let articleQuery = `
    SELECT id, title, content, category, tags, embedding 
    FROM articles 
    WHERE embedding IS NOT NULL AND status = 'published'
  `;
  const articleParams: unknown[] = [];
  
  if (category) {
    articleQuery += ' AND category = ?';
    articleParams.push(category);
  }
  
  const articles = db.prepare(articleQuery).all(...articleParams) as Array<{
    id: number;
    title: string;
    content: string;
    category: string;
    tags: string;
    embedding: string | null;
  }>;
  
  // Get all FAQs with embeddings
  let faqQuery = `
    SELECT id, question, answer, category, embedding 
    FROM faqs 
    WHERE embedding IS NOT NULL
  `;
  const faqParams: unknown[] = [];
  
  if (category) {
    faqQuery += ' AND category = ?';
    faqParams.push(category);
  }
  
  const faqs = db.prepare(faqQuery).all(...faqParams) as Array<{
    id: number;
    question: string;
    answer: string;
    category: string;
    embedding: string | null;
  }>;
  
  // Get all videos with embeddings (only done status)
  let videoQuery = `
    SELECT id, title, summary, key_topics, category, embedding 
    FROM videos 
    WHERE embedding IS NOT NULL AND analysis_status = 'done'
  `;
  const videoParams: unknown[] = [];
  
  if (category) {
    videoQuery += ' AND category = ?';
    videoParams.push(category);
  }
  
  const videos = db.prepare(videoQuery).all(...videoParams) as Array<{
    id: number;
    title: string;
    summary: string | null;
    key_topics: string;
    category: string;
    embedding: string | null;
  }>;
  
  // Calculate similarities and collect results
  const results: SearchResultItem[] = [];
  
  // Process articles
  for (const article of articles) {
    if (!article.embedding) continue;
    const embedding = JSON.parse(article.embedding);
    const score = cosineSimilarity(queryEmbedding.embedding, embedding);
    results.push({
      type: 'article',
      id: article.id,
      title: article.title,
      content: article.content,
      category: article.category,
      score,
      metadata: { tags: JSON.parse(article.tags || '[]') },
    });
  }
  
  // Process FAQs
  for (const faq of faqs) {
    if (!faq.embedding) continue;
    const embedding = JSON.parse(faq.embedding);
    const score = cosineSimilarity(queryEmbedding.embedding, embedding);
    results.push({
      type: 'faq',
      id: faq.id,
      title: faq.question,
      content: faq.answer,
      category: faq.category,
      score,
    });
  }
  
  // Process videos
  for (const video of videos) {
    if (!video.embedding) continue;
    const embedding = JSON.parse(video.embedding);
    const score = cosineSimilarity(queryEmbedding.embedding, embedding);
    results.push({
      type: 'video',
      id: video.id,
      title: video.title,
      content: video.summary || '',
      category: video.category,
      score,
      metadata: { key_topics: JSON.parse(video.key_topics || '[]') },
    });
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  // Return top results
  const topResults = results.slice(0, limit);
  
  return {
    results: topResults,
    query,
    total: results.length,
  };
}

/**
 * Update embedding for an article
 */
export function updateArticleEmbedding(id: number, embedding: number[]): boolean {
  const db = getDb();
  const stmt = db.prepare('UPDATE articles SET embedding = ? WHERE id = ?');
  const result = stmt.run(JSON.stringify(embedding), id);
  return result.changes > 0;
}

/**
 * Update embedding for an FAQ
 */
export function updateFaqEmbedding(id: number, embedding: number[]): boolean {
  const db = getDb();
  const stmt = db.prepare('UPDATE faqs SET embedding = ? WHERE id = ?');
  const result = stmt.run(JSON.stringify(embedding), id);
  return result.changes > 0;
}

/**
 * Update embedding for a video
 */
export function updateVideoEmbedding(id: number, embedding: number[]): boolean {
  const db = getDb();
  const stmt = db.prepare('UPDATE videos SET embedding = ? WHERE id = ?');
  const result = stmt.run(JSON.stringify(embedding), id);
  return result.changes > 0;
}

/**
 * Reindex all content - regenerate all embeddings
 */
export async function reindexAllContent(): Promise<{
  articles: number;
  faqs: number;
  videos: number;
  errors: string[];
}> {
  const db = getDb();
  const errors: string[] = [];
  
  // Get all published articles
  const articles = db.prepare(`
    SELECT id, title, content, category, tags FROM articles WHERE status = 'published'
  `).all() as Array<{
    id: number;
    title: string;
    content: string;
    category: string;
    tags: string;
  }>;
  
  // Get all FAQs
  const faqs = db.prepare(`
    SELECT id, question, answer, category FROM faqs
  `).all() as Array<{
    id: number;
    question: string;
    answer: string;
    category: string;
  }>;
  
  // Get all done videos
  const videos = db.prepare(`
    SELECT id, title, summary, key_topics, category FROM videos WHERE analysis_status = 'done'
  `).all() as Array<{
    id: number;
    title: string;
    summary: string | null;
    key_topics: string;
    category: string;
  }>;
  
  let articlesCount = 0;
  let faqsCount = 0;
  let videosCount = 0;
  
  // Reindex articles
  for (const article of articles) {
    try {
      const searchText = buildArticleSearchText({
        title: article.title,
        content: article.content,
        category: article.category,
        tags: JSON.parse(article.tags || '[]'),
      });
      
      const { embedding } = await generateEmbedding(searchText);
      updateArticleEmbedding(article.id, embedding);
      articlesCount++;
    } catch (error) {
      errors.push(`Article ${article.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Reindex FAQs
  for (const faq of faqs) {
    try {
      const searchText = buildFaqSearchText({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
      });
      
      const { embedding } = await generateEmbedding(searchText);
      updateFaqEmbedding(faq.id, embedding);
      faqsCount++;
    } catch (error) {
      errors.push(`FAQ ${faq.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Reindex videos
  for (const video of videos) {
    try {
      const searchText = buildVideoSearchText({
        title: video.title,
        summary: video.summary,
        key_topics: JSON.parse(video.key_topics || '[]'),
        category: video.category,
      });
      
      const { embedding } = await generateEmbedding(searchText);
      updateVideoEmbedding(video.id, embedding);
      videosCount++;
    } catch (error) {
      errors.push(`Video ${video.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return {
    articles: articlesCount,
    faqs: faqsCount,
    videos: videosCount,
    errors,
  };
}
