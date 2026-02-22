import { Pool } from 'pg';

let pool: Pool | null = null;

export function setPool(p: Pool) {
  pool = pool || p;
}

export function initSearchService(p: Pool) {
  pool = p;
}

function getPool(): Pool {
  if (!pool) {
    throw new Error('Database pool not initialized');
  }
  return pool;
}

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

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must be of the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Import from embedding-service
import { generateEmbedding } from './embedding-service.js';

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

export class SearchService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Perform semantic search across articles, FAQs, and videos
   */
  async semanticSearch(params: SemanticSearchParams): Promise<SemanticSearchResult> {
    const { query, limit = 5, category } = params;
    
    // Generate embedding for the query
    const { embedding: queryEmbedding } = await generateEmbedding(query);
    
    // Get all published articles with embeddings
    let articleQuery = `
      SELECT id, title, content, category, tags, embedding 
      FROM articles 
      WHERE embedding IS NOT NULL AND status = 'published'
    `;
    const articleParams: unknown[] = [];
    
    if (category) {
      articleQuery += ' AND category = $' + (articleParams.length + 1);
      articleParams.push(category);
    }
    
    const articles = (await this.pool.query(articleQuery, articleParams)).rows as Array<{
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
      faqQuery += ' AND category = $' + (faqParams.length + 1);
      faqParams.push(category);
    }
    
    const faqs = (await this.pool.query(faqQuery, faqParams)).rows as Array<{
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
      videoQuery += ' AND category = $' + (videoParams.length + 1);
      videoParams.push(category);
    }
    
    const videos = (await this.pool.query(videoQuery, videoParams)).rows as Array<{
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
      const embedding = typeof article.embedding === 'string' ? JSON.parse(article.embedding) : article.embedding;
      const score = cosineSimilarity(queryEmbedding, embedding);
      results.push({
        type: 'article',
        id: article.id,
        title: article.title,
        content: article.content,
        category: article.category,
        score,
        metadata: { tags: typeof article.tags === 'string' ? JSON.parse(article.tags || '[]') : article.tags },
      });
    }
    
    // Process FAQs
    for (const faq of faqs) {
      if (!faq.embedding) continue;
      const embedding = typeof faq.embedding === 'string' ? JSON.parse(faq.embedding) : faq.embedding;
      const score = cosineSimilarity(queryEmbedding, embedding);
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
      const embedding = typeof video.embedding === 'string' ? JSON.parse(video.embedding) : video.embedding;
      const score = cosineSimilarity(queryEmbedding, embedding);
      results.push({
        type: 'video',
        id: video.id,
        title: video.title,
        content: video.summary || '',
        category: video.category,
        score,
        metadata: { key_topics: typeof video.key_topics === 'string' ? JSON.parse(video.key_topics || '[]') : video.key_topics },
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
  async updateArticleEmbedding(id: number, embedding: number[]): Promise<boolean> {
    const result = await this.pool.query('UPDATE articles SET embedding = $1 WHERE id = $2', [JSON.stringify(embedding), id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Update embedding for an FAQ
   */
  async updateFaqEmbedding(id: number, embedding: number[]): Promise<boolean> {
    const result = await this.pool.query('UPDATE faqs SET embedding = $1 WHERE id = $2', [JSON.stringify(embedding), id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Update embedding for a video
   */
  async updateVideoEmbedding(id: number, embedding: number[]): Promise<boolean> {
    const result = await this.pool.query('UPDATE videos SET embedding = $1 WHERE id = $2', [JSON.stringify(embedding), id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Reindex all content - regenerate all embeddings
   */
  async reindexAllContent(): Promise<{
    articles: number;
    faqs: number;
    videos: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    
    // Get all published articles
    const articles = (await this.pool.query(`
      SELECT id, title, content, category, tags FROM articles WHERE status = 'published'
    `)).rows as Array<{
      id: number;
      title: string;
      content: string;
      category: string;
      tags: string;
    }>;
    
    // Get all FAQs
    const faqs = (await this.pool.query(`
      SELECT id, question, answer, category FROM faqs
    `)).rows as Array<{
      id: number;
      question: string;
      answer: string;
      category: string;
    }>;
    
    // Get all done videos
    const videos = (await this.pool.query(`
      SELECT id, title, summary, key_topics, category FROM videos WHERE analysis_status = 'done'
    `)).rows as Array<{
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
          tags: typeof article.tags === 'string' ? JSON.parse(article.tags || '[]') : article.tags,
        });
        
        const { embedding } = await generateEmbedding(searchText);
        await this.updateArticleEmbedding(article.id, embedding);
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
        await this.updateFaqEmbedding(faq.id, embedding);
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
          key_topics: typeof video.key_topics === 'string' ? JSON.parse(video.key_topics || '[]') : video.key_topics,
          category: video.category,
        });
        
        const { embedding } = await generateEmbedding(searchText);
        await this.updateVideoEmbedding(video.id, embedding);
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
}
