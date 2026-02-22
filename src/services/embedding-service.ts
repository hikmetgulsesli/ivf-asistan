import OpenAI from 'openai';
import { config } from '../config/index.js';

export interface SearchResult {
  id: number;
  type: 'article' | 'faq' | 'video';
  title: string;
  content?: string;
  url?: string;
  category: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface ArticleRecord {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  embedding: number[];
}

export interface FaqRecord {
  id: number;
  question: string;
  answer: string;
  category: string;
  embedding: number[];
}

export interface VideoRecord {
  id: number;
  title: string;
  url: string;
  category: string;
  summary: string;
  key_topics: string[];
  timestamps: Array<{ time: string; topic: string }>;
  embedding: number[];
}

export class EmbeddingService {
  private client: OpenAI;
  private apiHost: string;

  constructor(apiKey: string, apiHost: string = 'https://api.minimax.io') {
    this.client = new OpenAI({
      apiKey: apiKey,
      baseURL: `${apiHost}/v1`,
    });
    this.apiHost = apiHost;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'embo-01',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
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

  async search(
    query: string,
    articles: ArticleRecord[],
    faqs: FaqRecord[],
    videos: VideoRecord[],
    limit: number = 5
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const results: SearchResult[] = [];

    for (const article of articles) {
      if (!article.embedding) continue;
      const score = this.cosineSimilarity(queryEmbedding, article.embedding);
      if (score > 0.3) {
        results.push({
          id: article.id,
          type: 'article',
          title: article.title,
          content: article.content,
          category: article.category,
          score,
          metadata: { tags: article.tags },
        });
      }
    }

    for (const faq of faqs) {
      if (!faq.embedding) continue;
      const score = this.cosineSimilarity(queryEmbedding, faq.embedding);
      if (score > 0.3) {
        results.push({
          id: faq.id,
          type: 'faq',
          title: faq.question,
          content: faq.answer,
          category: faq.category,
          score,
        });
      }
    }

    for (const video of videos) {
      if (!video.embedding) continue;
      const score = this.cosineSimilarity(queryEmbedding, video.embedding);
      if (score > 0.3) {
        results.push({
          id: video.id,
          type: 'video',
          title: video.title,
          url: video.url,
          category: video.category,
          score,
          metadata: {
            summary: video.summary,
            key_topics: video.key_topics,
            timestamps: video.timestamps,
          },
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }
}

// Standalone function for embedding generation
export async function generateEmbedding(text: string): Promise<{ embedding: number[]; usage: { prompt_tokens: number; total_tokens: number } }> {
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
      model: 'abab6.5s-chat',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`MiniMax embedding API error: ${response.status} - ${error}`);
  }

  const data = await response.json() as {
    data: Array<{ embedding: number[] }>;
    usage?: { prompt_tokens: number; total_tokens: number };
  };
  
  if (!data.data || !data.data[0] || !data.data[0].embedding) {
    throw new Error('Invalid embedding response from MiniMax API');
  }

  return {
    embedding: data.data[0].embedding,
    usage: data.usage || { prompt_tokens: 0, total_tokens: 0 },
  };
}
