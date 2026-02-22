import { config } from '../config/index.js';

export interface EmbeddingResult {
  embedding: number[];
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface ArticleRecord {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  embedding: number[] | null;
}

export interface FaqRecord {
  id: number;
  question: string;
  answer: string;
  category: string;
  embedding: number[] | null;
}

export interface VideoRecord {
  id: number;
  title: string;
  url: string;
  category: string;
  summary: string | null;
  key_topics: string[];
  timestamps: Array<{ time: string; topic: string }>;
  embedding: number[] | null;
}

export interface SearchResult {
  type: 'article' | 'faq' | 'video';
  id: number;
  title: string;
  content?: string;
  url?: string;
  category: string;
  score: number;
}

interface MiniMaxEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

const EMBEDDING_MODEL = 'abab6.5s-chat';

/**
 * Generate embedding for text using MiniMax API
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!config.minimaxApiKey) {
    throw new Error('MINIMAX_API_KEY not configured');
  }

  const response = await fetch(`${config.minimaxApiHost}/v1/text/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.minimaxApiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax embedding API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as MiniMaxEmbeddingResponse;
  
  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    throw new Error('Invalid embedding response from MiniMax API');
  }

  return {
    embedding: data.data[0].embedding,
    usage: data.usage || { prompt_tokens: 0, total_tokens: 0 },
  };
}

/**
 * Generate embedding for a single item with performance timing
 */
export async function generateEmbeddingWithTiming(
  text: string
): Promise<{ result: EmbeddingResult; durationMs: number }> {
  const startTime = Date.now();
  const result = await generateEmbedding(text);
  const durationMs = Date.now() - startTime;
  
  return { result, durationMs };
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same dimension');
  }
  
  if (vec1.length === 0) {
    throw new Error('Vectors cannot be empty');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const normalizedProduct = Math.sqrt(norm1) * Math.sqrt(norm2);
  
  if (normalizedProduct === 0) {
    return 0;
  }

  return dotProduct / normalizedProduct;
}

/**
 * EmbeddingService class for semantic search
 */
export class EmbeddingService {
  private apiKey: string;
  private apiHost: string;

  constructor(apiKey: string, apiHost: string) {
    this.apiKey = apiKey;
    this.apiHost = apiHost;
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await fetch(`${this.apiHost}/v1/text/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MiniMax embedding API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as MiniMaxEmbeddingResponse;
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid embedding response from MiniMax API');
    }

    return {
      embedding: data.data[0].embedding,
      usage: data.usage || { prompt_tokens: 0, total_tokens: 0 },
    };
  }

  /**
   * Search across articles, FAQs, and videos using semantic similarity
   */
  async search(
    query: string,
    articles: ArticleRecord[],
    faqs: FaqRecord[],
    videos: VideoRecord[],
    limit: number = 5
  ): Promise<SearchResult[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.generateEmbedding(query);
    
    const results: SearchResult[] = [];

    // Search articles
    for (const article of articles) {
      if (!article.embedding) continue;
      
      const score = cosineSimilarity(queryEmbedding.embedding, article.embedding);
      results.push({
        type: 'article',
        id: article.id,
        title: article.title,
        content: article.content,
        category: article.category,
        score,
      });
    }

    // Search FAQs
    for (const faq of faqs) {
      if (!faq.embedding) continue;
      
      const score = cosineSimilarity(queryEmbedding.embedding, faq.embedding);
      results.push({
        type: 'faq',
        id: faq.id,
        title: faq.question,
        content: faq.answer,
        category: faq.category,
        score,
      });
    }

    // Search videos
    for (const video of videos) {
      if (!video.embedding) continue;
      
      const score = cosineSimilarity(queryEmbedding.embedding, video.embedding);
      results.push({
        type: 'video',
        id: video.id,
        title: video.title,
        url: video.url,
        category: video.category,
        score,
      });
    }

    // Sort by score descending and return top results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}
